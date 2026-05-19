from django import template
register = template.Library()

@register.filter(name='add_class')
def add_class(field, css_class):
    try:
        attrs = field.field.widget.attrs.copy()
    except AttributeError:
        return field
    existing_classes = attrs.get('class', '')
    if existing_classes:
        attrs['class'] = existing_classes + ' ' + css_class
    else:
        attrs['class'] = css_class
    return field.as_widget(attrs=attrs)