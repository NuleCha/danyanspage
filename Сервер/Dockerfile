FROM python:3.12-slim
WORKDIR /app
COPY Сервер/requirements.txt Сервер/requirements.txt
RUN pip install --no-cache-dir -r Сервер/requirements.txt
RUN useradd --uid 10001 --create-home guestbook && mkdir /data && chown guestbook:guestbook /data
COPY Инструменты/guestbook_server.py Инструменты/guestbook_server.py
COPY Инструменты/chat_server.py Инструменты/chat_server.py
COPY Инструменты/chat-public.html Инструменты/chat-public.html
COPY Инструменты/moderation.html Инструменты/moderation.html
COPY Инструменты/guestbook-public.html Инструменты/guestbook-public.html
COPY Сервер/app.py Сервер/app.py
ENV GUESTBOOK_DATA_DIR=/data
USER guestbook
EXPOSE 8000
CMD ["gunicorn", "--chdir", "Сервер", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "4", "--timeout", "30", "app:application"]
