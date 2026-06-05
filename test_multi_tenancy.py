import httpx
import sys
import time
import io

BASE_URL = "http://localhost:8000/api/v1"

def test_multi_tenancy_flow():
    print("--- Starting Multi-Tenant & Multi-Department Verification ---")
    ts = int(time.time())

    with httpx.Client(timeout=30.0) as client:
        # 1. Sign up Org A ("Alpha Corp")
        print("\n1. Signing up Org A (Alpha Corp)...")
        r = client.post(f"{BASE_URL}/public/signup-org", json={
            "name": f"Alpha Corp {ts}",
            "admin_name": "Alpha Admin",
            "admin_email": f"admin_a_{ts}@alpha.com",
            "admin_password": "AdminA@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: Org A signup returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        
        data_a = r.json()
        token_a = data_a["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        tenant_a_id = data_a["tenant_id"]
        print(f"   Success! Org A signed up. Tenant ID: {tenant_a_id}")

        # 2. Sign up Org B ("Beta Corp")
        print("\n2. Signing up Org B (Beta Corp)...")
        r = client.post(f"{BASE_URL}/public/signup-org", json={
            "name": f"Beta Corp {ts}",
            "admin_name": "Beta Admin",
            "admin_email": f"admin_b_{ts}@beta.com",
            "admin_password": "AdminB@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: Org B signup returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        
        data_b = r.json()
        token_b = data_b["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        tenant_b_id = data_b["tenant_id"]
        print(f"   Success! Org B signed up. Tenant ID: {tenant_b_id}")

        # 3. Verify standard departments autocreated for Org A
        print("\n3. Verifying autocreated departments for Org A...")
        r = client.get(f"{BASE_URL}/org/departments", headers=headers_a)
        if r.status_code != 200:
            print(f"FAILED: List departments returned status {r.status_code}")
            sys.exit(1)
        
        depts_a = r.json()
        dept_names_a = [d["name"] for d in depts_a]
        print(f"   Autocreated departments in Org A: {dept_names_a}")
        if "Human Resources" not in dept_names_a or "CMD Desk" not in dept_names_a:
            print("   FAILED: Standard departments were not autocreated!")
            sys.exit(1)

        # Retrieve IDs of standard departments in Org A
        hr_dept_id = next(d["id"] for d in depts_a if d["type"] == "HR")
        cmd_dept_id = next(d["id"] for d in depts_a if d["type"] == "CMD")

        # Create a custom department in Org A
        print("\n4. Creating custom NORMAL department in Org A...")
        r = client.post(f"{BASE_URL}/org/departments", json={
            "name": "Engineering Support",
            "type": "NORMAL"
        }, headers=headers_a)
        if r.status_code != 201:
            print(f"FAILED: Custom department creation returned status {r.status_code}")
            sys.exit(1)
        eng_dept_id = r.json()["id"]
        print(f"   Success! Created department ID: {eng_dept_id}")

        # 5. Invite Employee to Engineering Support in Org A
        print("\n5. Inviting Employee A to Engineering Support in Org A...")
        r = client.post(f"{BASE_URL}/org/invitations/invite", json={
            "email": f"emp_a_{ts}@alpha.com",
            "role": "EMPLOYEE",
            "department_id": eng_dept_id
        }, headers=headers_a)
        if r.status_code != 201:
            print(f"FAILED: Invite returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        
        inv_data = r.json()
        invite_token = inv_data["token"]
        print(f"   Success! Invitation token generated: {invite_token}")

        # 6. Accept invitation & set Employee password
        print("\n6. Accepting invitation for Employee A...")
        r = client.post(f"{BASE_URL}/public/invitations/accept", json={
            "token": invite_token,
            "password": "EmpA@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: Accept invitation returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        
        emp_a_token = r.json()["access_token"]
        emp_a_headers = {"Authorization": f"Bearer {emp_a_token}"}
        print("   Success! Employee A registered and logged in.")

        # 7. Employee A submits a complaint
        print("\n7. Submitting complaint as Employee A...")
        r = client.post(f"{BASE_URL}/complaints", json={
            "title": "Slow Internet in Engineering Support",
            "description": "The internet speed is below 10Mbps which blocks downloads and docker registry updates.",
            "employee_department": "Engineering Support",
            "employee_category": "IT / Infrastructure",
            "is_anonymous": False
        }, headers=emp_a_headers)
        if r.status_code not in [200, 201]:
            print(f"FAILED: Complaint submission returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        complaint_a = r.json()
        complaint_a_id = complaint_a["id"]
        print(f"   Success! Complaint created ID: {complaint_a_id}")

        # 8. Verify Cross-Tenant Isolation
        print("\n8. Verifying cross-tenant data isolation...")
        # Org Admin B (Beta Corp) attempts to retrieve Complaint A
        r = client.get(f"{BASE_URL}/complaints/{complaint_a_id}", headers=headers_b)
        print(f"   Org Admin B fetching Complaint A status: {r.status_code}")
        if r.status_code not in [403, 404]:
            print("   FAILED: Cross-tenant data leakage detected! Org Admin B could access Org A's complaint.")
            sys.exit(1)
        print("   Success! Cross-tenant access successfully blocked with 403/404.")

        # 9. Invite and login HR User in Org A to test HR sensitivity scoping
        print("\n9. Setting up HR User in Org A to test sensitivity rules...")
        r = client.post(f"{BASE_URL}/org/invitations/invite", json={
            "email": f"hr_staff_{ts}@alpha.com",
            "role": "HR",
            "department_id": hr_dept_id
        }, headers=headers_a)
        hr_token_str = r.json()["token"]
        
        # Accept HR invite
        r = client.post(f"{BASE_URL}/public/invitations/accept", json={
            "token": hr_token_str,
            "password": "HrStaff@1234"
        })
        hr_a_token = r.json()["access_token"]
        hr_a_headers = {"Authorization": f"Bearer {hr_a_token}"}

        # Invite and login CMD User in Org A
        r = client.post(f"{BASE_URL}/org/invitations/invite", json={
            "email": f"cmd_staff_{ts}@alpha.com",
            "role": "CMD",
            "department_id": cmd_dept_id
        }, headers=headers_a)
        cmd_token_str = r.json()["token"]
        
        # Accept CMD invite
        r = client.post(f"{BASE_URL}/public/invitations/accept", json={
            "token": cmd_token_str,
            "password": "CmdStaff@1234"
        })
        cmd_a_token = r.json()["access_token"]
        cmd_a_headers = {"Authorization": f"Bearer {cmd_a_token}"}

        # Submit an HR sensitive complaint
        print("\n10. Submitting HR-sensitive complaint as Employee A...")
        r = client.post(f"{BASE_URL}/complaints", json={
            "title": "Confidential Manager Harassment",
            "description": "I need to report sensitive harassment behavior from the manager.",
            "employee_department": "Engineering Support",
            "employee_category": "Harassment / Discrimination",
            "is_anonymous": True,
            "visibility_settings": "HR,ADMIN" # AI or user marks HR-sensitive
        }, headers=emp_a_headers)
        complaint_sensitive_id = r.json()["id"]

        # Override metadata to make it explicitly is_hr_sensitive = True
        r = client.post(f"{BASE_URL}/complaints/{complaint_sensitive_id}/override", json={
            "primary_department": "Human Resources",
            "sub_category": "Harassment",
            "priority_level": "CRITICAL",
            "is_hr_sensitive": True
        }, headers=headers_a)
        print("   Success! Complaint marked as sensitive.")

        # A. HR staff should be able to view
        r = client.get(f"{BASE_URL}/complaints/{complaint_sensitive_id}", headers=hr_a_headers)
        print(f"   HR User fetching sensitive complaint status: {r.status_code}")
        if r.status_code != 200:
            print("   FAILED: HR User should have access to sensitive complaints.")
            sys.exit(1)

        # B. CMD staff should NOT be able to view
        r = client.get(f"{BASE_URL}/complaints/{complaint_sensitive_id}", headers=cmd_a_headers)
        print(f"   CMD User fetching sensitive complaint status: {r.status_code}")
        if r.status_code != 403:
            print("   FAILED: CMD User should be blocked from sensitive HR complaints.")
            sys.exit(1)
        print("   Success! CMD User was correctly blocked with 403 Forbidden.")

    print("\n--- All Multi-Tenant & Multi-Department Verifications Passed! ---")

if __name__ == "__main__":
    test_multi_tenancy_flow()
