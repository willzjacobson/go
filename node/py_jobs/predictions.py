# update weather db and run predictions job

import larkin.weather.run as weather_run
import larkin.predictions.startup.run as srun

try:
    weather_run.main()
except:
	print 'Weather update failed'
finally:
    import datetime
    with open('prediction_start.txt', 'w') as f:
        f.write(str(datetime.datetime.utcnow()))
    srun.main()
