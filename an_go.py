# coding=utf-8
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
    l.log("benchmark_job", 2)

def weather_update_job():
    try:
        l.log("weather_update_job", 1)
        weather_run.main()
        l.log("weather_update_job", 2)
    except Exception as e:
        l.log("weather_update_job", 3)

def startup_prediction_job():
    l.log("startup_prediction_job", 1)
    try:
        weather_update_job()
        srun.main()
    except Exception as e:
        alerter.send_sms("Startup prediction job failed:\n"+str(e))
        l.log("startup_prediction_job", 3)
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
            startup_prediction_job()
    else:
        if hour<end or hour>=start:
            startup_prediction_job()

def startup_time_range_4to7():
    try:
        startup_time_range(4,7)
    except Exception as e:
        l.log("startup_time_range_4to7", 3)
        time.sleep(600)

def startup_time_range_18to4():
    try:
        startup_time_range(18,4)
    except Exception as e:
        l.log("startup_time_range_18to4", 3)
        time.sleep(300)


# Handle Threading
def run_on_thread(job_func):
    job_thread = threading.Thread(target = job_func)
    job_thread.start()


def main():
    print("Starting filewatcher")
    watcher_thread = threading.Thread(target=watch.main)
    watcher_thread.start()

    print("Scheduling jobs")
    two_thirty = parse_time_str(2) + ":30"
    schedule.every().day.at(two_thirty).do(run_on_thread, benchmark_job) # 02:30 Eastern

    schedule.every(1).minutes.do(startup_time_range_4to7)  # 4->7 Eastern every 15 mins
    schedule.every(40).minutes.do(startup_time_range_18to4) # 18->4 Easter

    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    main()
