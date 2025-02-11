log_message() {
    printf "[%02d:%02d:%02d] %s\n" $(date "+%H") $(date "+%M") $(date "+%S") "$1"
}

checkIfInNESTServer() {
    local expected_path="/home/boo/"
    local current_path=$(pwd)
    log_message "Checking directory location"
    log_message "Expected path: $expected_path"
    log_message "Current path: $current_path"
    
    if [[ "$current_path" == *"$expected_path"* ]]; then
        log_message "Directory check passed"
        return 0
    else
        log_message "Directory check failed"
        log_message "Error: Script must be run from '$expected_path' or its subdirectories"
        exit 1
    fi
}

reload_service() {
    local service_name="caddy"
    log_message "Service reload details:"
    log_message "Service name: $service_name"
    log_message "Attempting to reload $service_name service"
    
    systemctl --user reload $service_name
    local reload_status=$?
    
    if [ $reload_status -eq 0 ]; then
        log_message "$service_name service reloaded successfully"
    else
        log_message "Failed to reload $service_name service"
        log_message "Error code: $reload_status"
    fi
    return $reload_status
}

log_message "Starting reload script"
checkIfInNESTServer
reload_service
log_message "Script execution completed"