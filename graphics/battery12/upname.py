import os
import re

# Ask user for target number
target = int(input("Enter target number: "))

# Folder where this script is located
folder = os.path.dirname(os.path.abspath(__file__))

# Collect files that are >= target
files = []
for name in os.listdir(folder):
    m = re.match(r"Battery(\d+)\.png$", name)
    if m:
        num = int(m.group(1))
        if num >= target:      # Include the target itself
            files.append((num, name))

# Sort descending to rename from highest to lowest
files.sort(reverse=True)

# Rename files
for num, name in files:
    old_path = os.path.join(folder, name)
    new_name = f"Battery{num + 1}.png"
    new_path = os.path.join(folder, new_name)
    print(f"{name} -> {new_name}")
    os.rename(old_path, new_path)

print("Done")