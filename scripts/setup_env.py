"""Create ignored local configuration without printing credentials."""
from pathlib import Path
import secrets

path = Path('.env')
if path.exists():
    print('.env already exists; preserved existing configuration.')
else:
    password = secrets.token_hex(24)
    text = Path('.env.example').read_text().replace('replace_me', password)
    for key in ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'WEBHOOK_SECRET']:
        text = text.replace(key + '=\n', key + '=' + secrets.token_hex(32) + '\n')
    path.write_text(text)
    print('Created ignored .env with random local credentials.')
