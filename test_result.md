#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================


user_problem_statement: "Debt aging analysis app - Add special actions for 'Special Treatment/Payment' category: Payment (תשלום), Make Command (לעשות פקודה), Request Statement (לבקש כרטסת)"

backend:
  - task: "Generate payment Excel API"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Added POST /api/generate-payment endpoint that creates Excel file with payment list, calculates payment dates (invoice + 60 days -> 10th of month), and removes paid rows from DB"

frontend:
  - task: "Special Treatment action dropdown"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added special action dropdown with 3 options: 💰 תשלום, 📝 לעשות פקודה, 📋 לבקש כרטסת"
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Special Treatment dropdown works correctly. Found 5 action dropdowns in expanded table, all with correct 3 options: 💰 תשלום, 📝 לעשות פקודה, 📋 לבקש כרטסת. Red button expansion works perfectly."

  - task: "Payment modal"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added payment modal with checkbox selection for rows, total calculation, and Excel download"
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Payment modal (BLUE) opens successfully with title 'יצירת רשימת תשלום'. Shows supplier details, checkboxes for row selection, total amount calculation (₪ 1,500.50), and download button 'הורד רשימת תשלום (Excel)'. Checkbox toggle functionality works. Minor: Multiple modals can open simultaneously causing overlay issues."

  - task: "Statement request modal"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added statement request modal with date range selector and email sending via Microsoft Graph API"
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Statement request modal (PURPLE) opens successfully with title 'בקשת כרטסת'. Shows supplier details, date range inputs pre-filled with last 3 months (12/26/2025 to 09/26/2025), and email sending functionality. Minor: Multiple modals can open simultaneously causing overlay issues."

metadata:
  created_by: "main_agent"
  version: "1.2"
  test_sequence: 3
  run_ui: true

test_plan:
  current_focus:
    - "Special Treatment action dropdown"
    - "Payment modal"
    - "Statement request modal"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Implemented P1 features for Special Treatment category. The red category button now has unique action dropdown with 3 options: 1) תשלום - opens payment modal with row selection, generates Excel payment file, 2) לעשות פקודה - moves row to command category (already worked), 3) לבקש כרטסת - opens modal to send statement request email with date range. Backend API /api/generate-payment confirmed working (returns valid xlsx). Testing should: Upload file, click red special button, expand table, select row action dropdown and test each option."
