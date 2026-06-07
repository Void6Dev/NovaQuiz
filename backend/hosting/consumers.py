import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

INACTIVITY_WARN_SECS = 55 * 60   # send warning at 55 min idle
INACTIVITY_END_SECS  = 60 * 60   # auto-end at 60 min idle
MONITOR_INTERVAL     = 30        # check every 30 seconds


class SessionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for a live quiz session room.

    URL: ws://.../ws/sessions/<session_id>/

    Events sent to the client:
      {"type": "player.joined",    "username": "...", "player_count": N}
      {"type": "player.left",      "username": "...", "player_count": N}
      {"type": "player.kicked",    "username": "..."}
      {"type": "question.start",   "question_id": N, ...}
      {"type": "question.end",     "question_id": N}
      {"type": "player.answered",  "answered": N, "total": N}
      {"type": "session.started"}
      {"type": "session.ended"}
      {"type": "session.expiring", "seconds_left": N}   ← 5-min warning

    Events received from the host client:
      {"type": "question.start", "question_id": N, "time_limit": N}
      {"type": "question.end",   "question_id": N}
    """

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.group_name = f'session_{self.session_id}'
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        ok = await self._is_session_member(user, self.session_id)
        if not ok:
            await self.close(code=4003)
            return

        self.username = user.username
        self.is_host  = await self._is_host(user, self.session_id)
        self._monitor_task = None
        self._warned = False

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        count = await self._player_count(self.session_id)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'session.event',
            'payload': {'type': 'player.joined', 'username': self.username, 'player_count': count},
        })

        # Only the host drives the inactivity monitor
        if self.is_host:
            self._monitor_task = asyncio.ensure_future(self._inactivity_monitor())

    async def disconnect(self, close_code):
        if hasattr(self, '_monitor_task') and self._monitor_task:
            self._monitor_task.cancel()
            self._monitor_task = None

        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            count = await self._player_count(self.session_id)
            await self.channel_layer.group_send(self.group_name, {
                'type': 'session.event',
                'payload': {'type': 'player.left', 'username': getattr(self, 'username', ''), 'player_count': count},
            })

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, ValueError):
            return

        event_type = data.get('type', '')
        user = self.scope.get('user')

        # Only the host can broadcast control events
        is_host = await self._is_host(user, self.session_id)
        if event_type in ('question.start', 'question.end') and is_host:
            await self._touch_activity()
            self._warned = False   # reset warning on new question
            await self.channel_layer.group_send(self.group_name, {
                'type': 'session.event',
                'payload': data,
            })

    # ── Inactivity monitor (host-side only) ──────────────────────────────────

    async def _inactivity_monitor(self):
        try:
            while True:
                await asyncio.sleep(MONITOR_INTERVAL)

                ended, idle = await self._get_idle_seconds()
                if ended:
                    break

                if not self._warned and idle >= INACTIVITY_WARN_SECS:
                    self._warned = True
                    seconds_left = max(0, INACTIVITY_END_SECS - int(idle))
                    await self.channel_layer.group_send(self.group_name, {
                        'type': 'session.event',
                        'payload': {'type': 'session.expiring', 'seconds_left': seconds_left},
                    })

                if idle >= INACTIVITY_END_SECS:
                    await self._end_session_db()
                    await self.channel_layer.group_send(self.group_name, {
                        'type': 'session.event',
                        'payload': {'type': 'session.ended'},
                    })
                    break
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    # ── group message handler ────────────────────────────────────────────────
    async def session_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    # ── DB helpers ───────────────────────────────────────────────────────────

    @database_sync_to_async
    def _is_session_member(self, user, session_id):
        from hosting.models import Session, SessionPlayer
        try:
            session = Session.objects.get(id=session_id)
            if session.host_id == user.pk:
                return True
            return SessionPlayer.objects.filter(
                session=session, user=user, is_kicked=False
            ).exists()
        except Session.DoesNotExist:
            return False

    @database_sync_to_async
    def _is_host(self, user, session_id):
        from hosting.models import Session
        return Session.objects.filter(id=session_id, host=user).exists()

    @database_sync_to_async
    def _player_count(self, session_id):
        from hosting.models import SessionPlayer
        return SessionPlayer.objects.filter(session_id=session_id, is_kicked=False).count()

    @database_sync_to_async
    def _touch_activity(self):
        from hosting.models import Session
        Session.objects.filter(id=self.session_id).update(last_activity_at=timezone.now())

    @database_sync_to_async
    def _get_idle_seconds(self):
        from hosting.models import Session
        try:
            s = Session.objects.get(id=self.session_id)
            if s.has_ended:
                return True, 0
            idle = (timezone.now() - s.last_activity_at).total_seconds()
            return False, idle
        except Session.DoesNotExist:
            return True, 0

    @database_sync_to_async
    def _end_session_db(self):
        from hosting.models import Session
        Session.objects.filter(id=self.session_id, has_ended=False).update(has_ended=True)
