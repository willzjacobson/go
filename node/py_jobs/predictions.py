# update weather db and run predictions job

import larkin.weather.run as weather_run
import larkin.predictions.startup.run as srun
l
try:
    weather_run.main()
except:
	print 'Weather update failed'

try:
    srun.main()
except:
	print: 'Startup prediction failed'