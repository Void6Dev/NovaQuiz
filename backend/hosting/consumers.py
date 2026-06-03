import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class SessionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for a live quiz session room.

    URL: ws://.../ws/sessions/<session_id>/

    Events sent to the client:
      {"type": "player.joined",   "username": "...", "player_count": N}
      {"type": "player.left",     "username": "...", "player_count": N}
      {"type": "player.kicked",   "username": "..."}
      {"type": "question.start",  "question_id": N, ...}  (host-initiated)
      {"type": "question.end",    "question_id": N}        (host-initiated)
      {"type": "player.answered", "answered": N, "total": N}
      {"type": "session.started"}
      {"type": "session.ended"}

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
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        count = await self._player_count(self.session_id)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'session.event',
            'payload': {'type': 'player.joined', 'username': self.username, 'player_count': count},
        })

    async def disconnect(self, close_code):
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
            await self.channel_layer.group_send(self.group_name, {
                'type': 'session.event',
                'payload': data,
            })

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
