"""Package only Git-tracked, reviewed source; never copy ignored credentials."""
from pathlib import Path
import subprocess
import zipfile


def create_zip():
    output = Path('ClientSphere_Project.zip').resolve()
    subprocess.run(['git', 'archive', '--format=zip', '--output=' + str(output), 'HEAD'], check=True)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise RuntimeError('Archive integrity check failed')
        if any(Path(name).name.startswith('.env') and Path(name).name != '.env.example' for name in archive.namelist()):
            raise RuntimeError('Unexpected environment file in tracked source')
    print('Created a verified archive of tracked source.')


if __name__ == '__main__':
    create_zip()
