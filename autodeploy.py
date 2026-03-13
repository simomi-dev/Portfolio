import time
import subprocess
import os

DIR = r"C:\Users\Simo\.gemini\antigravity\scratch\ai-portfolio-website"
os.chdir(DIR)

print("Starting continuous deployment monitor...")
print(f"Watching directory: {DIR}")

while True:
    time.sleep(10)
    
    # Check if there are changes
    result = subprocess.run(["git", "status", "--short"], capture_output=True, text=True)
    output = result.stdout.strip()
    
    if output:
        print("\n--- Changes detected ---")
        print(output)
        print("Staging files...")
        subprocess.run(["git", "add", "."])
        
        print("Committing files...")
        commit_result = subprocess.run(["git", "commit", "-m", "Auto-update portfolio"], capture_output=True, text=True)
        
        print("Pushing to GitHub...")
        push_result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
        if push_result.returncode == 0:
            print("Successfully pushed changes. Netlify deployment triggered.")
        else:
            print("Failed to push changes:")
            print(push_result.stderr)
