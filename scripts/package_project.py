import os
import zipfile

EXCLUDE_DIRS = {
    'node_modules',
    '.venv',
    '.next',
    'dist',
    '.data',
    '.git',
    '__pycache__',
    '.pytest_cache',
    'test-results',
    'playwright-report',
    '.turbo',
    'coverage'
}

EXCLUDE_EXTS = {
    '.pyc',
    '.pyo',
    '.pyd',
    '.log'
}

OUTPUT_ZIP = 'ClientSphere_Project.zip'

def create_zip():
    root_dir = os.path.abspath('.')
    print(f"Creating {OUTPUT_ZIP} from {root_dir}...")
    
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
        file_count = 0
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Prune excluded directories
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            
            for filename in filenames:
                if filename == OUTPUT_ZIP:
                    continue
                ext = os.path.splitext(filename)[1].lower()
                if ext in EXCLUDE_EXTS:
                    continue
                
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, root_dir)
                
                zipf.write(full_path, arcname=rel_path)
                file_count += 1
                
    zip_size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print(f"Successfully created {OUTPUT_ZIP}: {file_count} files, {zip_size_mb:.2f} MB")
    
    # Verify zip integrity
    with zipfile.ZipFile(OUTPUT_ZIP, 'r') as zipf:
        corrupted = zipf.testzip()
        if corrupted is None:
            print("ZIP integrity test PASSED: all files valid.")
        else:
            print(f"ZIP integrity test FAILED: corrupted file {corrupted}")

if __name__ == '__main__':
    create_zip()
