import datetime

def log(job_name, action, log_to_screen=True):
    logfile = '/home/ubuntu/an_go/logs.txt'
    delim = " "
    new_line = "\n"
    actions = { 1 : "started",
               2 : "completed",
               3 : "errored" }

    log_str = ""
    action = actions[action]
    # if(action==1):
    #     log_str += new_line
    log_str += job_name + delim + action + delim + str(datetime.datetime.now()) + new_line
    if(log_to_screen):
        print(log_str)
    with open(logfile, 'a') as f:
    	f.write(log_str)

def main():
    pass

if __name__ == "__main__":
    main()
