import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

content = content.replace('{activeTab === "login" ? "ACCESS ENTERPRISE" : "ACTIVATE HOSTEL ACCESS"}', '{activeTab === "login" ? (liveCustomization?.buttonTextLogin || "ACCESS ENTERPRISE") : "ACTIVATE HOSTEL ACCESS"}')

with open('src/components/Login.tsx', 'w') as f:
    f.write(content)
