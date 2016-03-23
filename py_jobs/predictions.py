# update weather db and run predictions job

import larkin.weather.run as weather_run
import larkin.predictions.startup.run as srun

try:
    weather_run.main()
except:
	print 'Looks like weather update failed'
finally:
    srun.main()