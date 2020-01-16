# Travis Listener

Travis Listener is an architecture that crawls TravisCI to collect Builds and Jobs. 
It currently contains two plugins. One save all the builds and jobs inside a MangoDB database.
The second plugin detect the restarted builds and save them.

## Usage

1. Install Docker and Dockercompose
2. Add Github token in the file [github/server.js](github/server.js)
3. Start the service 
`docker-compose up -d`
3. Go to http://localhost:5001

## Architecture

Travis Listener of seven modules: three services, two plugins, a dashboard, and a database.
The infrastructure is built on top of Docker compose v2.4.
Docker Compose is straightforward to install, scalable, and resilient (given. e.g., its auto-restart capabilities). 
Each module of our infrastructure is thus a docker image integrated into  Docker compose.
The services, plugins, and the dashboard are implemented using JavaScript and Node.js v.10.

![Architecture](https://user-images.githubusercontent.com/5577568/72521555-90bd7d80-3853-11ea-8286-9a34aecad2b0.png)

### [Dashboard](front)

The Dashboard provides a web interface to configure and monitor the state of the different modules of the system.

### Database

For the Database, we use MongoDB which integrates well with Node.js and provides data compression by default.
Data compression is a useful feature, since we collect millions of highly compressible log files.

### [Log Parser Service](logparser)

The Log Parser Service is a service that is used to manipulate logs. 
The current version of the service provides the following features: 
1. Log minimization: removes the meaningless content such as progress bar status and log formatting. 
2. Log Diff: produced minimized diffs between two logs by removing all random or time-based content, such as ids or dates. 
3. Data extraction: parses the log to extract failures reasons such as test failures, checkstyle warnings, compilation errors, or timeouts. 
We are currently using 93 regular expressions to extract failure reasons from logs.

### [GitHub Service](github)

The GitHub Service is a simple middleware component that handles GitHub API's tokens.
It serves to simplify the usage of the GitHub API within Travis Listener by centralizing identification and rate limiting.

### [Travis Crawler Service](listener)

The Travis Crawler Service extracts the information from TravisCI. 
Its main purpose is to crawl TravisCI to detect any new jobs and builds triggered by TravisCI, live. 
Travis Crawler Service provides a WebSocket service that can be listened to by all Travis Listener modules. 
The WebSocket provides live notifications for any new TravisCI jobs or builds.

### [Build Saver Plugin](plugins/buildsaver)

The Build Saver Plugin listens to the Travis Crawler Service and saves all information to the database.
We save the following information: TravisCI's job, TravisCI's build, commit information (not including the diff), repository information, and user information.
The goal of this plugin is to track all changes, and provide statistics on who is using TravisCI.

### [Restarted Build Plugin](plugins/restartedbuilds)

The Restarted Build Plugin collects the information relevant to the present study.  
Its goal is to detect restarted builds on TravisCI.
When a build is restarted by a developer, all the original information is overwritten.  Tracking restarted builds thus requires live collection of build data (in our case, using the Build Saver Plugin).
To detect restarted builds, the Restarted Build Plugin crawls periodically (once a day) the collected builds from the 30 previous days, comparing the build start timestamp provided by the TravisCI' API to the start time saved by the Build Saver Plugin. 
If the two times differ, the build was restarted.
For each restarted build, we collect the new TravisCI job information and execution logs.