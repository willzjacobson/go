# coding=utf-8
import datetime
import time
import schedule
import threading

import nikral.jobs as bench
import larkin.weather.run as weather_run
import larkin.predictions.startup.run as srun

import watcher as watch
import logger as l
import sms_email as alerter

# Main Job Functions

def benchmark_job():
    l.log("benchmark_job", 1)
    try:
        bench.main()
    except Exception as e:
        alerter.send_sms("Benchmark job failed:\n"+str(e))
        l.log("benchmark_job", 3)
    else:
        l.log("benchmark_job", 2)

def weather_update_job():
    l.log("weather_update_job", 1)
    try:
        weather_run.main()
    except Exception as e:
        l.log("weather_update_job", 3)
    else:
        l.log("weather_update_job", 2)

def startup_prediction_job():
    l.log("startup_prediction_job", 1)
    try:
        weather_update_job()
        # set variable with start time
        with open('prediction_start.txt', 'w') as f:
            f.write(str(datetime.datetime.utcnow()))
        srun.main()
    except Exception as e:
        alerter.send_sms("Startup prediction job failed:\n"+str(e))
        l.log("startup_prediction_job", 3)
    else:
        l.log("startup_prediction_job", 2)


# Handles UTC-US/Eastern conversion
def parse_time_int(hr):
    # add hour offset between UTC and Eastern/US
    new_hr = 4 + hr
    if new_hr > 23:
        new_hr -= 24
    return new_hr

def parse_time_str(hr):
    new_hr = parse_time_int(hr)
    new_hr_str = str(new_hr)
    if new_hr < 10:
        new_hr_str = "0" + new_hr_str
    return new_hr_str

def startup_time_range(start, end):
    start = parse_time_int(start)
    end = parse_time_int(end)
    hour = int(time.strftime("%H"))
    if start<end:
        if hour<end and hour>=start:
            try:
                startup_prediction_job()
            except:
                l.log("startup_time_range",3)
    else:
        if hour<end or hour>=start:
            try:
                startup_prediction_job()
            except:
                l.log("startup_time_range",3)

def startup_time_range_1to4():
    try:
        startup_time_range(1,4)
    except Exception as e:
        l.log("startup_time_range_1to4", 3)
        time.sleep(600)

def startup_time_range_18to1():
    try:
        startup_time_range(18,1)
    except Exception as e:
        l.log("startup_time_range_18to1", 3)


# Handle Threading
def run_on_thread(job_func):
    try:
        job_thread = threading.Thread(target = job_func)
        job_thread.start()
    except:
        l.log("run_on_thread",3)


def main():
    l.log("Filewatcher script",1)
    watcher_thread = threading.Thread(target=watch.main)
    watcher_thread.start()

    l.log("Scheduler",1)
    two_thirty = parse_time_str(5) + ":00"
    schedule.every().day.at(two_thirty).do(run_on_thread, benchmark_job) # 02:30 Eastern

    schedule.every(1).minutes.do(startup_time_range_1to4)  # 4->7 Eastern every 15 mins
    schedule.every(30).minutes.do(startup_time_range_18to1) # 18->4 Easter

    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    main()
