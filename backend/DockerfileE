FROM python:3.10-alpine

WORKDIR /app

COPY src/ .

ARG PUBLIC_IP
RUN pip install -r requirements.txt



ENTRYPOINT ["python3"]
EXPOSE 8080
CMD ["-u", "app.py"]