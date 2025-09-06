#!/usr/bin/env bash

# Enhanced color palette and styling (shared)
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

# Professional Unicode symbols (shared)
CHECK_MARK="✓"
CROSS_MARK="✗"
INFO_SYMBOL="ℹ"
ARROW="→"
GEAR="⚙"
CLOCK="⏱"
CHART="📊"
MERGE="🔄"
FOLDER="📁"
SEARCH="🔍"
TARGET="🎯"
FILE_SYMBOL="📁"
TEST_TUBE="🧪"

# Shared function to print section headers with decorative borders
print_header() {
    local title="$1"
    local color="$2"
    echo ""
    if [ "$1" = "coverage" ]; then
        echo "${color}${BOLD}╭─────────────────────────────────────────────╮${NC}"
        printf "${color}${BOLD}│ %-43s │${NC}\n" "$title"
        echo "${color}${BOLD}╰─────────────────────────────────────────────╯${NC}"
    else
        echo "${color}${BOLD}┌─────────────────────────────────────────────┐${NC}"
        printf "${color}${BOLD}│ %-43s │${NC}\n" "$title"
        echo "${color}${BOLD}└─────────────────────────────────────────────┘${NC}"
    fi
}

# Shared function to print status messages with icons
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
    "search")
        echo "${CYAN}${SEARCH} ${message}${NC}"
        ;;
    "merge")
        echo "${BLUE}${MERGE} ${message}${NC}"
        ;;
    "chart")
        echo "${GREEN}${CHART} ${message}${NC}"
        ;;
    esac
}

# Shared function to show progress with timing
show_progress() {
    local message="$1"
    echo "${CYAN}${CLOCK} ${message}${NC}"
}

# Function to print file operations with proper formatting
print_file_operation() {
    local source="$1"
    local dest="$2"
    echo "${GRAY}${DIM}   ${ARROW} ${source} ${NC}${GRAY}→${NC} ${GRAY}${DIM}${dest}${NC}"
}

# Function to print statistics
print_stats() {
    local label="$1"
    local value="$2"
    local color="${3:-$CYAN}" # Default to cyan if no color specified
    printf "${color}${BOLD}%-20s${NC} ${GRAY}${DIM}%s${NC}\n" "$label:" "$value"
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

# Coverage merge functionality
run_coverage_merge() {
    # Clear screen section for better visual separation
    echo "${GRAY}${DIM}══════════════════════════════════════════════════════════════${NC}"

    # --- Initialization ---
    print_header "Coverage Merge Initialization" "$BLUE"

    show_progress "Starting coverage merge process..."
    start_time=$(date +%s)

    print_status "Setting up directory structure" "process"
    mkdir -p merged-coverage coverage

    print_status "Directory structure created successfully" "success"
    print_stats "Merge Directory" "merged-coverage/"
    print_stats "Output Directory" "coverage/"

    # --- Coverage File Discovery ---
    print_header "Coverage File Discovery" "$CYAN"

    show_progress "Scanning for coverage-final.json files..."
    print_status "Searching in coverage-reports directory tree" "search"

    # Collect coverage files with enhanced feedback
    count=0
    for file in $(find coverage-reports -name "coverage-final.json" -type f 2>/dev/null); do
        shard_name="shard_$count.json"
        print_file_operation "$file" "merged-coverage/$shard_name"
        cp "$file" "merged-coverage/$shard_name"
        count=$((count + 1))
    done

    if [ "$count" -eq 0 ]; then
        print_status "No coverage-final.json files found in coverage-reports/" "error"
        print_status "Ensure your test shards have generated coverage files" "info"
        print_status "Expected location: coverage-reports/**/coverage-final.json" "info"
        echo "${GRAY}${DIM}══════════════════════════════════════════════════════════════${NC}"
        exit 1
    fi

    # Display collection summary
    print_status "Found coverage files - preparing for merge" "success"
    print_stats "Total Shards Found" "$count"
    print_stats "Files Copied" "$count"

    # --- Coverage Merging ---
    print_header "Coverage Data Merging" "$PURPLE"

    show_progress "Merging $count coverage reports using nyc..."
    print_status "Consolidating shard coverage data" "merge"

    if npx nyc merge merged-coverage merged-coverage.json; then
        print_status "Coverage merge completed successfully" "success"

        # Check merged file size for validation
        if [ -f "merged-coverage.json" ]; then
            file_size=$(stat -f%z "merged-coverage.json" 2>/dev/null || stat -c%s "merged-coverage.json" 2>/dev/null || echo "unknown")
            print_stats "Merged File Size" "${file_size} bytes"
        fi
    else
        print_status "Coverage merge failed" "error"
        exit 1
    fi

    # --- Report Generation ---
    print_header "Coverage Report Generation" "$GREEN"

    show_progress "Generating comprehensive coverage reports..."

    # Generate reports with progress indication
    print_status "Generating HTML report format" "chart"
    print_status "Generating Text report format" "chart"
    print_status "Generating LCOV report format" "chart"

    if npx nyc report \
        --reporter=html \
        --reporter=text \
        --reporter=lcov \
        --temp-dir=merged-coverage; then
        print_status "All coverage reports generated successfully" "success"
    else
        print_status "Report generation failed" "error"
        exit 1
    fi

    # --- Report Summary ---
    print_header "Coverage Report Summary" "$CYAN"

    # Check generated report files
    html_report="coverage/index.html"
    lcov_report="coverage/lcov.info"

    if [ -f "$html_report" ]; then
        print_stats "HTML Report" "✓ Available at $html_report"
    else
        print_stats "HTML Report" "✗ Not found"
    fi

    if [ -f "$lcov_report" ]; then
        print_stats "LCOV Report" "✓ Available at $lcov_report"
    else
        print_stats "LCOV Report" "✗ Not found"
    fi

    print_stats "Text Report" "✓ Displayed above"

    # --- Optional Threshold Checking ---
    print_header "Coverage Validation" "$YELLOW"

    print_status "Coverage threshold checking is available" "info"
    print_status "Uncomment the check-coverage line to enforce thresholds" "info"
    echo "${DIM}${GRAY}Example: npx nyc check-coverage --branches=80 --functions=80 --lines=80 --statements=80${NC}"

    # Uncomment the following lines to enable threshold checking:
    # print_status "Enforcing coverage thresholds..." "process"
    # if npx nyc check-coverage --branches=80 --functions=80 --lines=80 --statements=80; then
    #     print_status "All coverage thresholds met" "success"
    # else
    #     print_status "Coverage thresholds not met" "error"
    #     exit 1
    # fi

    # --- Completion Summary ---
    end_time=$(date +%s)
    duration=$((end_time - start_time))

    print_header "Process Completion" "$GREEN"

    print_status "Coverage merge process completed successfully" "success"
    print_stats "Shards Processed" "$count"
    print_stats "Execution Time" "${duration}s"
    print_stats "Reports Location" "coverage/"

    # Final success message
    echo ""
    echo "${GREEN}${BOLD}${CHECK_MARK} Coverage merge complete! ${NC}${DIM}Reports are ready for review.${NC}"
    echo "${CYAN}${INFO_SYMBOL} ${DIM}Open ${BOLD}coverage/index.html${NC}${DIM} to view detailed HTML report${NC}"
    echo "${GRAY}${DIM}══════════════════════════════════════════════════════════════${NC}"
}

# Test time sync functionality
run_test_time_sync() {
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
}

# Show usage information
show_usage() {
    echo "${BLUE}${BOLD}Usage:${NC}"
    echo "  ${CYAN}${BOLD}./main.sh cc${NC}     ${GRAY}${DIM}# Run coverage merge${NC}"
    echo "  ${CYAN}${BOLD}./main.sh${NC}        ${GRAY}${DIM}# Run test time sync${NC}"
    echo ""
    echo "${YELLOW}${BOLD}Arguments:${NC}"
    echo "  ${CYAN}cc${NC}                ${GRAY}${DIM}Coverage merge mode${NC}"
    echo "  ${CYAN}<no args>${NC}         ${GRAY}${DIM}Test time sync mode (default)${NC}"
    echo ""
    echo "${GREEN}${BOLD}Examples:${NC}"
    echo "  ${DIM}./main.sh cc          # Merge coverage reports${NC}"
    echo "  ${DIM}./main.sh             # Sync test timing data${NC}"
}

# Main script logic
case "${1:-}" in
    "--combine-coverage")
        run_coverage_merge
        ;;
    "-h"|"--help"|"help")
        show_usage
        ;;
    "--sync-test-time")
        run_test_time_sync
        ;;
    *)
        echo "${RED}${BOLD}${CROSS_MARK} Unknown argument: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
