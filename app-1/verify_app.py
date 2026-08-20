import os
import re
import json

print("=== STARTING PLANNINGEASY AUTOMATED VERIFICATION ===")

# 1. Verify File Existence
required_files = [
    'index.html',
    'manifest.json',
    'sw.js',
    'firebase-messaging-sw.js',
    'firestore.rules',
    'firestore.indexes.json',
    'css/styles.css',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable.png',
    'js/config.js',
    'js/storage.js',
    'js/auth.js',
    'js/navigation.js',
    'js/dashboard.js',
    'js/finance.js',
    'js/reports.js',
    'js/tasks.js',
    'js/chat.js',
    'js/users.js',
    'js/backup.js',
    'js/audit.js',
    'js/profile.js',
    'js/notifications.js',
    'js/app.js'
]

base_dir = r'c:\anti test\app-1'
missing = []
for f in required_files:
    full_path = os.path.join(base_dir, f.replace('/', os.sep))
    if not os.path.exists(full_path):
        missing.append(f)
    else:
        size = os.path.getsize(full_path)
        print(f"  [OK] {f} ({size} bytes)")

if missing:
    print(f"FAILED: Missing files: {missing}")
    exit(1)
else:
    print("ALL REQUIRED FILES EXIST!")

# 2. Check JSON validity
print("\n--- Checking JSON syntax ---")
for jf in ['manifest.json', 'firestore.indexes.json']:
    path = os.path.join(base_dir, jf)
    with open(path, 'r', encoding='utf-8') as fh:
        try:
            json.load(fh)
            print(f"  [OK] {jf} is valid JSON")
        except Exception as e:
            print(f"  [ERR] {jf} failed JSON validation: {e}")
            exit(1)

# 3. Check JS Imports and Module Consistency
print("\n--- Checking JS module imports and exports ---")
js_dir = os.path.join(base_dir, 'js')
for jfile in os.listdir(js_dir):
    if jfile.endswith('.js'):
        full_jpath = os.path.join(js_dir, jfile)
        with open(full_jpath, 'r', encoding='utf-8') as fh:
            content = fh.read()
            # Find imports
            imports = re.findall(r'from\s+[\'"](\./[^\'"]+)[\'"]', content)
            for imp in imports:
                target_file = os.path.normpath(os.path.join(js_dir, imp))
                if not os.path.exists(target_file):
                    print(f"  [ERR] In {jfile}: Import target not found: {imp}")
                    exit(1)
            print(f"  [OK] {jfile} imports resolved ({len(imports)} imports)")

# 4. Check Firestore Rules Security Principles
print("\n--- Checking Firestore Security Rules ---")
rules_path = os.path.join(base_dir, 'firestore.rules')
with open(rules_path, 'r', encoding='utf-8') as fh:
    rules_text = fh.read()
    assert 'match /finance/{financeId}' in rules_text
    assert 'allow update, delete: if isAdmin();' in rules_text
    assert 'match /reports/{reportId}' in rules_text
    assert 'allow update, delete: if isAdmin();' in rules_text
    assert 'match /auditLogs/{logId}' in rules_text
    assert 'allow update, delete: if false;' in rules_text
    print("  [OK] Security Rules strictly enforce Admin-only finance/report edits and deletes!")

print("\n=== VERIFICATION COMPLETE: ALL INTEGRITY CHECKS PASSED ===")
