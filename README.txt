УЛУК ИНТЕРНЕШЕНЛ — сайт IT-услуг

Файлы сайта:
- index.html — главная
- services.html — услуги
- cases.html — кейсы
- about.html — о компании
- contact.html — контакты и форма заявки
- admin.html — панель управления
- data.json — базовый контент
- main.js / admin.js / cloud.js — логика сайта
- cloud-config.js — настройки Supabase
- SUPABASE_SETUP.sql — SQL для таблицы заявок

Вход в админку:
- admin / admin123
- viewer / viewer123

Подключение облака:
1. Создайте проект в Supabase.
2. Выполните SUPABASE_SETUP.sql в SQL Editor.
3. Укажите Supabase URL и anon/publishable key в cloud-config.js.
4. При необходимости подключите telegram-notify через Supabase Edge Functions.
