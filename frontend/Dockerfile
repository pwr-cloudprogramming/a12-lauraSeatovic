FROM busybox:1.35

RUN adduser -D stud
USER stud
WORKDIR /home/stud

COPY src/ .


ARG PUBLIC_IP

RUN sed -i "s#const baseUrl = 'http://localhost:8080';#const baseUrl = 'http://${PUBLIC_IP}:8080';#g" tic_tac_toe.js
RUN sed -i "s#const baseUrl = 'http://localhost:8080';#const baseUrl = 'http://${PUBLIC_IP}:8080';#g" scores.js
ENTRYPOINT ["busybox"]
EXPOSE 3000
CMD ["httpd", "-f", "-v", "-p", "3000"]