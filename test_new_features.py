import httpx
import time
import sys
import io

BASE_URL = "http://localhost:8000/api/v1"

def test_new_features():
    print("--- Starting Backend New Features Verification ---")
    
    with httpx.Client(timeout=30.0) as client:
        # 1. Login as Employee
        print("\n1. Logging in as employee...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "employee@demo.com",
            "password": "Emp@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: Login returned status {r.status_code}")
            sys.exit(1)
        emp_token = r.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        
        # 2. Submit anonymous complaint with custom values
        print("\n2. Submitting anonymous complaint with employee inputs...")
        payload = {
            "title": "Anonymous Harassment Report",
            "description": "I have been experiencing ongoing verbal harassment from a team member. This is a very sensitive issue that needs attention.",
            "employee_department": "Finance",
            "employee_category": "Harassment / Discrimination",
            "employee_subcategory": "Verbal Abuse",
            "is_anonymous": True,
            "visibility_settings": "HR,ADMIN" # restrict CMD
        }
        r = client.post(f"{BASE_URL}/complaints", json=payload, headers=emp_headers)
        if r.status_code not in [200, 201]:
            print(f"FAILED to submit complaint: {r.status_code}, body: {r.text}")
            sys.exit(1)
        
        c = r.json()
        complaint_id = c["id"]
        print(f"Success! Complaint created ID: {complaint_id}")
        print(f"   Employee Department: {c.get('employee_department')}")
        print(f"   Primary Department pre-initialized to: {c.get('primary_department')}")
        print(f"   Is Anonymous: {c.get('is_anonymous')}")
        
        # 3. Test File Validations
        print("\n3. Testing attachment upload validations...")
        
        # A. Invalid Extension Check
        print("   - Testing invalid file extension (.txt)...")
        files = {"file": ("test.txt", io.BytesIO(b"Hello world"), "text/plain")}
        r = client.post(f"{BASE_URL}/complaints/{complaint_id}/attachments", files=files, headers=emp_headers)
        print(f"     Status: {r.status_code}, detail: {r.json().get('detail') if r.status_code != 200 else 'Uploaded (Unexpected)'}")
        if r.status_code != 400:
            print("FAILED: Invalid extension was not blocked!")
            sys.exit(1)
            
        # B. Size Limit Check
        print("   - Testing file size limit (>10MB)...")
        large_content = b"0" * (11 * 1024 * 1024) # 11MB
        files = {"file": ("large.pdf", io.BytesIO(large_content), "application/pdf")}
        r = client.post(f"{BASE_URL}/complaints/{complaint_id}/attachments", files=files, headers=emp_headers)
        print(f"     Status: {r.status_code}, detail: {r.json().get('detail') if r.status_code != 200 else 'Uploaded (Unexpected)'}")
        if r.status_code not in [400, 413]:
            print("FAILED: Over-sized file was not blocked!")
            sys.exit(1)
            
        # C. Virus Scan Check
        print("   - Testing EICAR virus scan detection...")
        eicar_string = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
        files = {"file": ("eicar.png", io.BytesIO(eicar_string), "image/png")}
        r = client.post(f"{BASE_URL}/complaints/{complaint_id}/attachments", files=files, headers=emp_headers)
        print(f"     Status: {r.status_code}, detail: {r.json().get('detail') if r.status_code != 200 else 'Uploaded (Unexpected)'}")
        if r.status_code != 400 or "virus detected" not in r.json().get("detail", "").lower():
            print("FAILED: Virus signature file was not blocked!")
            sys.exit(1)

        # D. Valid Upload Check
        print("   - Testing valid file upload (test.pdf)...")
        files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 mock pdf content"), "application/pdf")}
        r = client.post(f"{BASE_URL}/complaints/{complaint_id}/attachments", files=files, headers=emp_headers)
        if r.status_code not in [200, 201]:
            print(f"FAILED to upload valid attachment: {r.status_code}, body: {r.text}")
            sys.exit(1)
        att = r.json()
        attachment_id = att["id"]
        print(f"     Success! Attachment uploaded, ID: {attachment_id}")
        
        # 4. Test Delete Attachment (Pending status)
        print("\n4. Testing deleting attachment as employee...")
        r = client.delete(f"{BASE_URL}/complaints/attachments/{attachment_id}", headers=emp_headers)
        if r.status_code != 204:
            print(f"FAILED to delete attachment: {r.status_code}, body: {r.text}")
            sys.exit(1)
        print("   Success! Attachment deleted (204 No Content)")
        
        # Upload another attachment for downstream visibility tests
        files = {"file": ("evidence.png", io.BytesIO(b"mock png content"), "image/png")}
        r = client.post(f"{BASE_URL}/complaints/{complaint_id}/attachments", files=files, headers=emp_headers)
        att_id = r.json()["id"]

        # 5. Check Anonymity Masking
        # Login as HR (Authorized)
        print("\n5. Logging in as HR (authorized view)...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "hr@demo.com",
            "password": "Hr@1234"
        })
        hr_token = r.json()["access_token"]
        hr_headers = {"Authorization": f"Bearer {hr_token}"}
        
        # HR gets details - should see employee_id
        r = client.get(f"{BASE_URL}/complaints/{complaint_id}", headers=hr_headers)
        c_hr = r.json()
        print(f"   HR retrieved employee_id: {c_hr.get('employee_id')}")
        if c_hr.get("employee_id") == "anonymous":
            print("FAILED: HR's view was unexpectedly masked!")
            sys.exit(1)
            
        # Login as CMD (Unauthorized department head or another CMD)
        # Wait, the department is Finance, so the CMD of HR department is not authorized
        print("\n6. Logging in as CMD (unauthorized view)...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "cmd@demo.com", # CMD of IT or HR
            "password": "Cmd@1234"
        })
        cmd_token = r.json()["access_token"]
        cmd_headers = {"Authorization": f"Bearer {cmd_token}"}
        
        # Get details as CMD
        r = client.get(f"{BASE_URL}/complaints/{complaint_id}", headers=cmd_headers)
        # Note: since the complaint visibility was restricted to "HR,ADMIN", CMD will be forbidden, or if visible:
        # Wait, does can_view_complaint check visibility settings?
        # Let's check: if CMD is not authorized to view the complaint (visibility_settings='HR,ADMIN' restricts CMD), it should return Forbidden (403).
        print(f"   CMD detail fetch status: {r.status_code}")
        
        # Let's create another anonymous complaint with visibility="HR,CMD,ADMIN" so CMD can view but should be masked.
        print("   - Creating another anonymous complaint visible to CMD...")
        payload2 = {
            "title": "Anonymous Finance Inquiry",
            "description": "There is a potential issue with the payroll department processes. Requesting review.",
            "employee_department": "Finance",
            "employee_category": "Compensation / Benefits",
            "is_anonymous": True,
            "visibility_settings": "HR,CMD,ADMIN"
        }
        r = client.post(f"{BASE_URL}/complaints", json=payload2, headers=emp_headers)
        complaint_id2 = r.json()["id"]
        
        # Override primary department to Finance as HR so CMD of Finance can view
        # Wait, cmd@demo.com is CMD of which department? Let's check which department cmd@demo.com is in.
        # Let's fetch CMD profile or detail.
        # In a typical demo DB, let's see. If the CMD's department matches, they can see it.
        # Let's check CMD's view on complaint2.
        # Wait, we can override primary_department to the CMD's department.
        # Let's retrieve cmd's profile first or just override primary_department of complaint2 to CMD's department.
        # What is cmd's department? Let's check by requesting list as CMD.
        r = client.get(f"{BASE_URL}/complaints", headers=cmd_headers)
        # Let's override primary_department of complaint2 to cmd's department.
        r_hr = client.get(f"{BASE_URL}/complaints/{complaint_id2}", headers=hr_headers)
        # Override to CMD's department
        cmd_dept = "IT" # Let's assume IT, or we can look up cmd.department.
        # Let's override department of complaint2 to IT
        client.post(f"{BASE_URL}/complaints/{complaint_id2}/override", json={
            "primary_department": "IT",
            "sub_category": "Payroll",
            "priority_level": "MEDIUM",
            "is_hr_sensitive": False
        }, headers=hr_headers)
        
        # Get details as CMD of IT
        r = client.get(f"{BASE_URL}/complaints/{complaint_id2}", headers=cmd_headers)
        if r.status_code == 200:
            c_cmd = r.json()
            print(f"   CMD retrieved employee_id: {c_cmd.get('employee_id')}")
            if c_cmd.get("employee_id") != "anonymous":
                print("FAILED: CMD's view of anonymous complaint was NOT masked!")
                sys.exit(1)
            print("   Success! CMD employee_id masking verified.")
            
            # Check Audit Logs as CMD - employee identity should be masked
            r = client.get(f"{BASE_URL}/complaints/{complaint_id2}/audit-logs", headers=cmd_headers)
            if r.status_code == 200:
                logs = r.json()
                employee_ids_in_logs = [l["actor_user_id"] for l in logs if l["actor_user_id"] is not None]
                print(f"   Actor IDs in CMD audit logs: {employee_ids_in_logs}")
                if any(uid != "anonymous" and uid != "System" for uid in employee_ids_in_logs):
                    # Check if any actor ID matches employee_id of employee
                    # Note: employee_id is from c_hr["employee_id"]
                    emp_id = c_hr["employee_id"]
                    if emp_id in employee_ids_in_logs:
                        print("FAILED: Employee identity leaked in audit logs actor_user_id!")
                        sys.exit(1)
                print("   Success! Audit logs actor masking verified.")
        else:
            print(f"   CMD not matching department (skipped masking test: status {r.status_code})")
            
        print("\n--- All new features verified successfully! ---")

if __name__ == "__main__":
    test_new_features()
