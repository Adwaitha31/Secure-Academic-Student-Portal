🎓 Secure Academic Student Portal

A Role-Based Access Controlled & Cryptography-Driven Web Application

📌 Project Overview

This project is a secure student academic portal 
The system is designed with privacy, confidentiality, integrity, and access control as first-class principles.

The application implements Role-Based Access Control (RBAC) with three distinct roles:

Student

Faculty

Admin (Auditor)

Each role has clearly defined permissions, ensuring least privilege access and strong data isolation.

👥 User Roles & Permissions
🎒 Student

Students can:

Submit assignment documents

View their own grades and faculty feedback

View announcements posted by faculty

🔒 Security guarantees

Uploaded assignments are encrypted

Grades & feedback are encrypted and accessible only by the respective student

👩‍🏫 Faculty

Faculty members can:

Create assignments with deadlines

Post announcements

View submitted student assignments

Grade assignments and provide feedback

🔐 Faculty cannot view:

Admin audit logs

🛡️ Admin (Auditing Role)

The admin role is strictly for monitoring and auditing.

Admin can:

View login summaries

View activity logs (who logged in, when, role used)

🚫 Admin cannot:

View student grades

View feedback

View assignment contents

This design enforces privacy by design and prevents misuse of elevated privileges.

🔐 Authentication & Security Architecture
🔑 Login System

Username + Password based authentication

Multi-Factor Authentication (MFA) using OTP

🔒 Password Security

Password policy follows NIST guidelines

Passwords are:

Hashed using bcrypt

Salted automatically to prevent rainbow-table attacks

Plaintext passwords are never stored

📄 Assignment Security

Uploaded assignment files are:

Base64 encoded (safe storage & transmission)

Encrypted using AES (Advanced Encryption Standard)

This ensures:

Confidentiality of academic submissions

Protection against unauthorized file access

✍️ Digital Signatures

SHA-256 is used for digital signatures

Ensures:

Data integrity

Tamper detection

Authenticity of submitted content

📊 Grades & Feedback Protection

Grades and feedback are:

Encrypted before storage

Decrypted only for the intended student

Even faculty or admins cannot view encrypted feedback once stored.

🧠 Security Design Highlights

Role-based access prevents horizontal & vertical privilege escalation

MFA mitigates credential-stuffing attacks

bcrypt hashing protects against password leaks

AES encryption ensures confidentiality of sensitive academic data

SHA-256 ensures integrity and authenticity

Admin role enforces transparency without violating privacy

🎯 Academic Relevance

This project demonstrates practical implementation of:

RBAC (Role-Based Access Control)

Secure authentication mechanisms

Cryptographic primitives (Hashing, Encryption, Digital Signatures)

Secure data storage and access isolation

Designed specifically to align with Cyber Security Lab Evaluation objectives.

📌 Conclusion

This portal is not just a functional academic system but a security-first application that mirrors real-world secure platforms used in educational institutions.
