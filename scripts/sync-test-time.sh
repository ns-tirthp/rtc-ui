#!/bin/sh

# Enhanced color palette for better visual hierarchy
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
GRAY='\033[0;90m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Unicode symbols for better visual appeal
CHECK_MARK="✓"
CROSS_MARK="✗"
INFO_SYMBOL="ℹ"
ARROW="→"
GEAR="⚙"
CLOCK="⏱"
FILE_SYMBOL="📁"
TEST_TUBE="🧪"

# Function to print section headers with decorative borders
print_header() {
    local title="$1"
    local color="$2"
    echo ""
    echo "${color}${BOLD}┌─────────────────────────────────────────────┐${NC}"
    printf "${color}${BOLD}│ %-43s │${NC}\n" "$title"
    echo "${color}${BOLD}└─────────────────────────────────────────────┘${NC}"
}

# Function to print status messages with icons
print_status() {
    local message="$1"
    local type="$2"

    case "$type" in
        "success")
            echo "${GREEN}${BOLD}${CHECK_MARK} ${message}${NC}"
            ;;
        "error")
            echo "${RED}${BOLD}${CROSS_MARK} ${message}${NC}"
            ;;
        "info")
            echo "${CYAN}${INFO_SYMBOL} ${DIM}${message}${NC}"
            ;;
        "warning")
            echo "${YELLOW}${BOLD}⚠ ${message}${NC}"
            ;;
        "process")
            echo "${PURPLE}${GEAR} ${message}${NC}"
            ;;
    esac
}

# Function to print file lists with proper indentation
print_file_list() {
    local files="$1"
    local prefix="$2"

    echo "${GRAY}${DIM}${prefix}${NC}"
    for file in $files; do
        echo "${GRAY}${DIM}   ${ARROW} ${file}${NC}"
    done
}

# Function to show progress indication
show_progress() {
    local message="$1"
    echo "${CYAN}${CLOCK} ${message}${NC}"
}

# Clear screen section for better visual separation
echo "${GRAY}${DIM}════════════════════════════════════════════════════════════${NC}"

# --- Test File Detection ---
print_header "Test File Detection" "$BLUE"

show_progress "Analyzing staged files for test patterns..."

NEW_S_TEST_FILES=$(git diff --cached --name-only --diff-filter=A | grep -E '\.test\.(tsx|js|ts)$' || true)
NEW_D_TEST_FILES=$(git diff --cached --name-only --diff-filter=D | grep -E '\.test\.(tsx|js|ts)$' || true)

# Handle deleted test files
if [ -n "$NEW_D_TEST_FILES" ]; then
    print_status "Found deleted test files" "warning"
    print_file_list "$NEW_D_TEST_FILES" "Deleted test files:"

    print_header "Cleanup Operations" "$YELLOW"
    show_progress "Removing timing data for deleted test suites..."

    if node scripts/updateTimings.mjs $NEW_D_TEST_FILES; then
        print_status "Successfully cleaned up timing data" "success"
    else
        print_status "Failed to clean up timing data" "error"
        exit 1
    fi

    print_status "Pre-commit cleanup completed" "success"
    echo "${GRAY}${DIM}════════════════════════════════════════════════════════════${NC}"
    exit 0
fi

# Handle case with no new test files
if [ -z "$NEW_S_TEST_FILES" ]; then
    print_status "No new test files detected in staged changes" "info"
    print_status "Skipping test execution phase" "info"
    echo "${GRAY}${DIM}════════════════════════════════════════════════════════════${NC}"
    exit 0
fi

# Show detected test files
print_status "Detected new test files for execution" "success"
print_file_list "$NEW_S_TEST_FILES" "New test files found:"

# --- Test Execution ---
print_header "Test Execution" "$GREEN"

show_progress "Initializing test runner for staged files..."
echo "${DIM}${GRAY}Command: yarn test $NEW_S_TEST_FILES --silent --json --outputFile=temp-test-results.json${NC}"

if yarn test $NEW_S_TEST_FILES --silent --json --outputFile=temp-test-results.json; then
    print_status "All tests passed successfully" "success"
else
    print_status "Test execution failed - aborting commit" "error"

    # Cleanup on failure
    if [ -f "temp-test-results.json" ]; then
        rm temp-test-results.json
        print_status "Cleaned up temporary test results" "info"
    fi

    echo "${RED}${BOLD}${GRAY}════════════════════════════════════════════════════════════${NC}"
    exit 1
fi

# --- Processing and Combining Results ---
print_header "Result Processing" "$PURPLE"

show_progress "Processing test results and updating timing data..."

if node scripts/updateTimings.mjs --new temp-test-results.json --out timing.json; then
    print_status "Successfully updated timing.json with new results" "success"
else
    print_status "Failed to update timing data" "error"
    exit 1
fi

# --- Cleanup and Git Add ---
print_header "Finalization" "$CYAN"

show_progress "Performing cleanup operations..."
if rm -f temp-test-results.json; then
    print_status "Temporary files cleaned up" "success"
else
    print_status "Warning: Failed to clean temporary files" "warning"
fi

show_progress "Staging updated timing.json for commit..."
if git add timing.json; then
    print_status "timing.json added to commit" "success"
else
    print_status "Failed to stage timing.json" "error"
    exit 1
fi

# Final success message with summary
print_header "Completion Summary" "$GREEN"
print_status "Pre-commit validation completed successfully" "success"
print_status "$(echo $NEW_S_TEST_FILES | wc -w | tr -d ' ') test files processed" "info"
print_status "Timing data updated and staged" "info"

echo ""
echo "${GREEN}${BOLD}${CHECK_MARK} Ready to commit! ${NC}${DIM}All validations passed.${NC}"
echo "${GRAY}${DIM}════════════════════════════════════════════════════════════${NC}"
