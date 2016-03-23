# emergency
import an_go as go
import watcher as watch
import threading


def main():
    go.startup_prediction_job()
    watch.main()
    # put watcher on thread so we can run benchmark
    # watcher_thread = threading.Thread(target=watch.main)
    # watcher_thread.start()
    #go.benchmark_job()

if __name__ == "__main__":
    main()
