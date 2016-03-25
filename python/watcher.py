import datetime
import glob
import json
import os
import time
import mongo_connect
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer
import sms_email as alerter

# log_directory must be created when the jobs are scheduled
log_directory = '/home/ubuntu/.larkin/jsons/startup/'
archive_directory = '/home/ubuntu/.larkin/archive/'

def main():
    # first address any files that already exist
    existing_files = glob.glob(log_directory + "*.json")
    for file_path in existing_files:
        log_startup_prediction(file_path)

    # watch for new files
    observer = Observer()
    # for now, only watching in startup folder. Will have to watch in folders for each resource as they are introduced
    observer.schedule(MyHandler(), path=log_directory, recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


class MyHandler(FileSystemEventHandler):

    def on_created(self, event):
        self.process(event)

    def process(self, event):
        """
            event.event_type: 'modified', 'created', 'moved', 'deleted'
            event.is_directory: True, False
            event.src_path: path/to/observed/file
        """
        # the file will be processed here
        if event.is_directory is False:
            print event.src_path, event.event_type  # print now only for debug
            log_startup_prediction(event.src_path)


def log_startup_prediction(file_path):
    try:
        with open(file_path, 'r') as f:
            the_json = json.loads(f.read())
            save_succeeded = True
            try:
                save_timeseries(the_json)
            except Exception as e:
                alerter.send_sms("Error saving timeseries: " + str(e))
                save_succeeded = False
            try:
                create_save_message(the_json)
            except Exception as e:
                alerter.send_sms("Error generating message: " + str(e))
                save_succeeded = False
            if save_succeeded:
                # move to archive dir
                new_file = archive_directory + os.path.basename(file_path)
                os.rename(file_path, new_file)
    except:
        alerter.send_sms("Error processing JSON file")
        print "An error occured processing file " + file_path


def save_timeseries(json_data):
    predictions = mongo_connect.get_predictions()
    predictions['startup_prediction'].insert(json_data, check_keys=False)


def create_save_message(json_data):
    # create message from json file
    time_now = datetime.datetime.utcnow().replace(hour=0, minute=0,second=0,microsecond=0)
    startup_dt_string = json_data["345_Park"]["random_forest"]["best_start_time"]["time"]
    startup_datetime = datetime.datetime.strptime(startup_dt_string, "%Y-%m-%dT%H:%M:%S.%fZ")
    startup_hour = startup_datetime.hour - 1
    adj_startup_datetime = startup_datetime.replace(hour=startup_hour)
    # don't save message if prediction is too far in future
    now_hour = datetime.datetime.utcnow().hour
    now_day = time_now.day
    pred_day = startup_datetime.day
    if (pred_day != now_day) and (now_hour<21):
        # todo: log error here
        print "not creating a message for tomorrow"
        return

    with open('prediction_start.txt', 'r') as f:
        start_time = f.read()

    print "preparing message"
    message = {
        "namespace": "345_Park",
        "date": time_now,
        "name": "morning-startup",
        "body": {
            "score": json_data["345_Park"]["random_forest"]["best_start_time"]["score"],
            "prediction-time" : adj_startup_datetime,
            "analysis-start-time" : start_time,
            "analysis-finish-time" : datetime.datetime.utcnow()
        },
        "status": "pending",
        "time": adj_startup_datetime,
        "type": "alert",
        "fe_vis": True
    }
    # put message in db
    skynet = mongo_connect.get_skynet()
    skynet['messages'].find_and_modify(query={'namespace':'345_Park', 'name':'morning-startup','status':'pending'}, update={ '$set': {'status':'cancel'}}, new=True)
    skynet['messages'].find_and_modify(query={'namespace':'345_Park', 'name':'morning-startup','status':'ack'}, update={ '$set': {'status':'cancel'}}, new=True)
    skynet['messages'].insert(message)


if __name__ == "__main__":
    main()
