FROM mariadb:latest


RUN apt-get update && apt-get -y install vim

COPY ./sql-scripts/ /docker-entrypoint-initdb.d/

EXPOSE 3306
