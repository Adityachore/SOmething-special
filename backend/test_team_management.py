import httpx
import sys
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_team_management():
    print("--- Starting Teams & Committees API E2E Verification ---")
    
    with httpx.Client(timeout=30.0) as client:
        # 1. Login as HR Manager
        print("\n1. Logging in as HR Manager...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "hr@demo.com",
            "password": "Hr@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: HR Login failed: {r.status_code}, {r.text}")
            sys.exit(1)
        hr_token = r.json()["access_token"]
        hr_headers = {"Authorization": f"Bearer {hr_token}"}
        print("   HR logged in successfully.")

        # 2. Create a test Investigator user
        ts = int(time.time())
        inv_email = f"team_inv_{ts}@demo.com"
        inv_pwd = "Password@123"
        print(f"\n2. Creating a test investigator user ({inv_email})...")
        r = client.post(f"{BASE_URL}/employees", json={
            "employee_id": f"EMP_INV_{ts}",
            "name": "Team Investigator User",
            "email": inv_email,
            "password": inv_pwd,
            "role": "INVESTIGATOR",
            "department": "HR",
            "designation": "Investigator",
            "phone": "9998887776",
            "date_of_joining": "2026-06-01T00:00:00Z"
        }, headers=hr_headers)
        if r.status_code != 201:
            print(f"FAILED to create investigator: {r.status_code}, {r.text}")
            sys.exit(1)
        inv_data = r.json()
        inv_uuid = inv_data["id"]
        print(f"   Investigator user created: UUID {inv_uuid}")

        # 3. Create a Team
        team_name = f"POSH Committee {ts}"
        print(f"\n3. Creating a new team: {team_name}...")
        r = client.post(f"{BASE_URL}/org/teams", json={
            "name": team_name,
            "type": "POSH"
        }, headers=hr_headers)
        if r.status_code != 201:
            print(f"FAILED to create team: {r.status_code}, {r.text}")
            sys.exit(1)
        team_data = r.json()
        team_uuid = team_data["id"]
        print(f"   Team created successfully! UUID: {team_uuid}")

        # 4. Add Investigator to Team
        print("\n4. Adding investigator to the team...")
        r = client.post(f"{BASE_URL}/org/teams/{team_uuid}/members", json={
            "user_id": inv_uuid,
            "role_in_team": "MEMBER"
        }, headers=hr_headers)
        if r.status_code != 201:
            print(f"FAILED to add member: {r.status_code}, {r.text}")
            sys.exit(1)
        print("   Member added successfully!")

        # Verify team details contains member
        r = client.get(f"{BASE_URL}/org/teams/{team_uuid}", headers=hr_headers)
        members = r.json()["members"]
        assert any(m["user_id"] == inv_uuid for m in members), "Investigator not found in team members list!"
        print("   Verified member in team details.")

        # 5. Login as Employee and Submit Complaint
        print("\n5. Logging in as standard employee...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "employee@demo.com",
            "password": "Emp@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: Employee login failed: {r.status_code}, {r.text}")
            sys.exit(1)
        emp_token = r.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        
        print("   Submitting a complaint...")
        r = client.post(f"{BASE_URL}/complaints", json={
            "title": "Harassment Grievance E2E",
            "description": "This is a detailed complaint description that has at least 20 characters as required."
        }, headers=emp_headers)
        if r.status_code != 201:
            print(f"FAILED to submit complaint: {r.status_code}, {r.text}")
            sys.exit(1)
        complaint_uuid = r.json()["id"]
        print(f"   Complaint submitted! UUID: {complaint_uuid}")

        # 6. Assign Complaint to Team
        print("\n6. Assigning complaint to POSH Committee team...")
        r = client.post(f"{BASE_URL}/complaints/{complaint_uuid}/assign", json={
            "assigned_team_id": team_uuid
        }, headers=hr_headers)
        if r.status_code != 200:
            print(f"FAILED to assign complaint: {r.status_code}, {r.text}")
            sys.exit(1)
        print(f"   Complaint assigned! Assigned Team ID in response: {r.json().get('assigned_team_id')}")
        assert r.json().get("assigned_team_id") == team_uuid

        # 7. Login as Team Investigator and Access Complaint
        print("\n7. Logging in as Team Investigator...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": inv_email,
            "password": inv_pwd
        })
        if r.status_code != 200:
            print(f"FAILED: Team Investigator login failed: {r.status_code}")
            sys.exit(1)
        inv_token = r.json()["access_token"]
        inv_headers = {"Authorization": f"Bearer {inv_token}"}
        
        print("   Retrieving assigned complaint as Investigator...")
        r = client.get(f"{BASE_URL}/complaints/{complaint_uuid}", headers=inv_headers)
        if r.status_code != 200:
            print(f"FAILED: Investigator was blocked from viewing team-assigned complaint! Status: {r.status_code}, {r.text}")
            sys.exit(1)
        print(f"   Access GRANTED! Complaint title: '{r.json().get('title')}'")

        # 8. Query complaints by team
        print("\n8. Listing complaints filtered by team...")
        r = client.get(f"{BASE_URL}/complaints?team_id={team_uuid}", headers=inv_headers)
        if r.status_code != 200:
            print(f"FAILED: Filtered listing failed: {r.status_code}")
            sys.exit(1)
        items = r.json()["items"]
        assert any(c["id"] == complaint_uuid for c in items), "Assigned complaint not returned in team-filtered list!"
        print(f"   Found assigned complaint in team-filtered list (total items: {r.json()['total']})")

        # 9. Verify non-member access is blocked
        print("\n9. Testing access for non-member standard employee...")
        # Create a second investigator user who is NOT in the team
        other_email = f"other_inv_{ts}@demo.com"
        r = client.post(f"{BASE_URL}/employees", json={
            "employee_id": f"EMP_OTH_{ts}",
            "name": "Other Investigator User",
            "email": other_email,
            "password": inv_pwd,
            "role": "EMPLOYEE",
            "department": "Engineering",
            "designation": "Engineer",
            "phone": "9998887777"
        }, headers=hr_headers)
        
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": other_email,
            "password": inv_pwd
        })
        other_token = r.json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}
        
        r = client.get(f"{BASE_URL}/complaints/{complaint_uuid}", headers=other_headers)
        print(f"   Non-member access status code: {r.status_code} (expecting 403)")
        if r.status_code != 403:
            print("   FAILED: Non-member was allowed to access or returned wrong status code!")
            sys.exit(1)
        print("   Success! Non-member access correctly blocked.")

        # Clean up
        print("\nCleaning up test resources...")
        # Resolve/close complaint first so team can be deleted
        r = client.post(f"{BASE_URL}/complaints/{complaint_uuid}/resolve", json={
            "resolution_note": "Resolved in E2E team test",
            "root_cause": "N/A"
        }, headers=hr_headers)
        r = client.post(f"{BASE_URL}/complaints/{complaint_uuid}/close", headers=hr_headers)
        
        # Delete team
        r = client.delete(f"{BASE_URL}/org/teams/{team_uuid}", headers=hr_headers)
        if r.status_code != 204:
            print(f"FAILED to delete team: {r.status_code}, {r.text}")
        else:
            print("   Team deleted.")
            
        print("\n--- All tests passed! Teams module verified successfully. ---")

if __name__ == "__main__":
    test_team_management()
