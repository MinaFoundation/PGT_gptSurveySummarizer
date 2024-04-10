#!/usr/bin/env sh

# Main entry point
main() {
    # Check if REDIS_URL is set
    if [ -z "$REDIS_URL" ]; then
        echo "Error: REDIS_URL environment variable is not set."
        echo "Please set REDIS_URL to the URL of your Redis server."
        exit 1
    fi

    # If Redis connection is successful, run npm with provided arguments
    echo "Running npm with arguments: $@"
    npm run "$@"
}

# Call the main function
main "$@"

