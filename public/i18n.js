import { catalog } from './catalog.js';
// English is the source language; unknown imported content remains unchanged.
export const languages = ['en', 'ru', 'kk'];
export const normalizeLanguage = value => value === 'kz' ? 'kk' : languages.includes(value) ? value : 'en';
export const locales = { en: 'en-GB', ru: 'ru-RU', kk: 'kk-KZ' };
export const messages = {};
// Stable keys for shared navigation; legacy content remains compatible.
const uiLabels = { 'nav.overview': 'Overview', 'nav.path': 'My growth path', 'nav.activities': 'Explore activities', 'nav.journal': 'My journey', 'nav.hr': 'Team overview', 'nav.import': 'Data workspace' };
export const translateKey = (key, language) => Object.hasOwn(uiLabels, key) ? translateText(uiLabels[key], language) : undefined;
function add(en, ru, kk) { messages[en] = { ru, kk }; }
const rows = [
['Automatic catalog coverage','Автоматическое дополнение каталога','Каталогты автоматты толықтыру'],
['Missing learning steps are filled with guided self-study practice. Existing courses and assessed skills are preserved.','Недостающие шаги обучения дополняются самостоятельной практикой с заданиями. Существующие курсы и оценки навыков сохраняются.','Жетіспейтін оқу қадамдары тапсырмалары бар өздік практикамен толықтырылады. Қолданыстағы курстар мен дағды бағалары сақталады.'],
['Employees with skill gaps','Сотрудники с дефицитами навыков','Дағдыларын дамыту қажет қызметкерлер'],
['Without recommendations in the original catalog','Без рекомендаций в исходном каталоге','Бастапқы каталогта ұсынысы жоқ қызметкерлер'],
['Without recommendations after supplementation','Без рекомендаций после дополнения','Толықтырудан кейін ұсынысы жоқ қызметкерлер'],
['Automatically added practice activities','Автоматически добавленные задания','Автоматты түрде қосылған тапсырмалар'],
['Automatically added practice','Автоматически добавленная практика','Автоматты түрде қосылған практика'],
['Suggested self-study, not a scheduled provider course. Save your work and check it against the task before marking completion. Completion is self-reported in this demo.','Предложение для самостоятельной практики, а не курс провайдера с расписанием. Сохраните работу и проверьте выполнение задания перед отметкой о завершении. В демо завершение отмечается самостоятельно.','Бұл — кестесі бар провайдер курсы емес, өздік практикаға арналған ұсыныс. Аяқталды деп белгілемес бұрын жұмысыңызды сақтап, тапсырмаға сәйкестігін тексеріңіз. Демода аяқтауды өзіңіз белгілейсіз.'],
['Additional guided practice will be added to cover catalog gaps.','Для заполнения пробелов каталога будут добавлены практические задания.','Каталогтағы олқылықтарды толықтыру үшін практикалық тапсырмалар қосылады.'],
['Explain the core concepts in your own words and work through one simple example.','Объясните основные понятия своими словами и разберите один простой пример.','Негізгі ұғымдарды өз сөзіңізбен түсіндіріп, бір қарапайым мысалды талдаңыз.'],
['Solve a small independent task and document your approach and expected result.','Самостоятельно выполните небольшое задание, опишите подход и ожидаемый результат.','Шағын тапсырманы өзіңіз орындап, тәсіліңіз бен күтілетін нәтижені сипаттаңыз.'],
['Complete a realistic task, test the result and explain how you handled mistakes.','Выполните практическую задачу, проверьте результат и объясните, как исправляли ошибки.','Практикалық тапсырманы орындап, нәтижесін тексеріңіз және қателерді қалай түзеткеніңізді түсіндіріңіз.'],
['Compare two approaches to a complex case and justify your choice, trade-offs and checks.','Сравните два подхода к сложной задаче, обоснуйте выбор, компромиссы и способы проверки.','Күрделі тапсырмаға екі тәсілді салыстырып, таңдауыңызды, ымыралы шешімдер мен тексеру әдістерін негіздеңіз.'],
['Design a solution to a complex case, define review criteria and document limitations and improvements.','Разработайте решение сложной задачи, определите критерии проверки, опишите ограничения и улучшения.','Күрделі тапсырманың шешімін әзірлеп, тексеру өлшемдерін анықтаңыз, шектеулер мен жақсартуларды сипаттаңыз.'],
['Validate the selected files again before applying them.','Проверьте выбранные файлы повторно перед применением.','Қолданбас бұрын таңдалған файлдарды қайта тексеріңіз.'],
['Download full backup','Скачать полную резервную копию','Толық сақтық көшірмені жүктеп алу'],
['Restore full backup','Восстановить полную резервную копию','Толық сақтық көшірмені қалпына келтіру'],
['Dataset export excludes personal plans. Use a full backup to restore all data.','Экспорт датасета не включает личные планы. Для восстановления всех данных используйте полную резервную копию.','Деректер экспорты жеке жоспарларды қамтымайды. Барлық деректі қалпына келтіру үшін толық сақтық көшірмені қолданыңыз.'],
['Duplicate completions do not grant extra skill gains.','Повторные завершения не увеличивают навыки повторно.','Қайталанған аяқтау жазбалары дағдыларды қайта арттырмайды.'],
['Restoring this backup replaces all current data and personal plans.','Восстановление этой копии заменит все текущие данные и личные планы.','Бұл көшірмені қалпына келтіру барлық ағымдағы деректер мен жеке жоспарларды ауыстырады.'],
['Enrollment not found.','Запись на активность не найдена.','Іс-шараға тіркелу жазбасы табылмады.'],
['CSV has empty column names.','В CSV есть пустые названия столбцов.','CSV файлында бос баған атаулары бар.'],
['Unsupported backup version.','Неподдерживаемая версия резервной копии.','Сақтық көшірменің бұл нұсқасына қолдау көрсетілмейді.'],
['Backup must include the complete personal plan.','Резервная копия должна содержать полный личный план.','Сақтық көшірме толық жеке жоспарды қамтуы керек.'],
['Invalid enrollments.','Некорректный список записей на активности.','Іс-шараларға тіркелу тізімі қате.'],
['Invalid enrollment reference.','В записи неизвестный сотрудник или активность.','Тіркелу жазбасындағы қызметкер немесе іс-шара белгісіз.'],
['Duplicate enrollment.','Повторная запись на активность.','Іс-шараға тіркелу жазбасы қайталанады.'],
['Invalid enrollment date.','Некорректная дата записи.','Тіркелу күні қате.'],
['Invalid withdrawn enrollments.','Некорректный список отменённых записей.','Бас тартылған тіркелулер тізімі қате.'],
['HR workspace','Кабинет HR','HR кабинеті'],
['your current grade','вашего текущего грейда','қазіргі грейдіңіз'],
['live','текущие данные','ағымдағы деректер'],
['Invalid JSON file. Check its syntax and try again.','Некорректный JSON. Проверьте синтаксис файла и повторите попытку.','JSON файлы қате. Файлдың синтаксисін тексеріп, қайталап көріңіз.'],
['Dataset must be an object.','Данные должны быть объектом.','Деректер объект түрінде болуы керек.'],
['Dataset files have different snapshot dates.','Даты среза в файлах различаются.','Файлдардағы деректердің күндері сәйкес келмейді.'],
['Invalid employee row.','Некорректная запись сотрудника.','Қызметкер туралы жазба қате.'],
['Invalid event row.','Некорректная запись активности.','Іс-шара туралы жазба қате.'],
['Invalid history row.','Некорректная запись истории.','Қатысу тарихындағы жазба қате.'],
['Choose one to four dataset files.','Выберите от одного до четырёх файлов данных.','Бірден төртке дейін деректер файлын таңдаңыз.'],
['CSV contains an unclosed quoted field.','В CSV не закрыты кавычки поля.','CSV өрісіндегі тырнақша жабылмаған.'],
['CSV is empty.','CSV пуст.','CSV файлы бос.'],
['CSV has duplicate column names.','В CSV повторяются названия столбцов.','CSV файлындағы баған атаулары қайталанады.'],
['Invalid snapshot date.','Некорректная дата среза.','Деректердің күні қате көрсетілген.'],
['Invalid role profile.','Некорректный профиль роли.','Рөл профилі қате.'],
['Duplicate role/grade profile.','Повторяется профиль роли и грейда.','Рөл мен грейд профилі қайталанады.'],
['Role profile has an unknown skill or invalid level.','В профиле роли неизвестный навык или неверный уровень.','Рөл профилінде белгісіз дағды немесе қате деңгей бар.'],
['Critical skills must have a requirement.','Для критических навыков нужны требования.','Маңызды дағдыларға қойылатын талаптар көрсетілуі керек.'],
['History contains an unknown employee/event, invalid date, status, or on_time value.','В истории неизвестный сотрудник/активность либо неверные дата, статус или on_time.','Қатысу тарихында белгісіз қызметкер немесе іс-шара бар, не күн, мәртебе немесе on_time мәні қате.'],
['Duplicate history record ID.','Повторяется ID записи истории.','Қатысу тарихындағы жазбаның ID мәні қайталанады.'],
['History on_time must be true, false or unknown.','Значение on_time должно быть true, false или неизвестным.','Қатысу тарихындағы on_time мәні true, false немесе белгісіз болуы керек.'],
['No recognized dataset collections were provided.','Не найдено поддерживаемых разделов данных.','Қолдау көрсетілетін деректер бөлімдері табылмады.'],
['Upload a dataset object or choose an individual file type.','Загрузите объект данных или выберите отдельный тип файла.','Деректер объектісін жүктеңіз немесе жеке файл түрін таңдаңыз.'],
['Upload limit is 8 MB.','Лимит загрузки — 8 МБ.','Жүктеу шегі — 8 МБ.'],
['Files must be an array.','Файлы должны быть массивом.','Файлдар массив түрінде берілуі керек.'],
['Request must contain valid JSON.','Запрос должен содержать корректный JSON.','Сұрауда дұрыс JSON болуы керек.'],
['Activity actions are available only in your own employee account.','Действия с активностями доступны только в собственном аккаунте сотрудника.','Іс-шараларға қатысты әрекеттерді тек өз қызметкер аккаунтыңызда орындауға болады.'],
['Not found.','Не найдено.','Табылмады.'],
['API endpoint not found.','Адрес API не найден.','API мекенжайы табылмады.'],
['Method not allowed.','Метод не разрешён.','Бұл әдіске рұқсат жоқ.'],
['Use application/json.','Используйте application/json.','application/json пішімін қолданыңыз.'],
['Invalid origin.','Некорректный источник запроса.','Сұрау көзі қате.'],
['Cross-origin requests are not allowed.','Запросы с другого сайта запрещены.','Басқа сайттан жіберілген сұрауларға рұқсат жоқ.'],
['Asset unavailable.','Файл недоступен.','Файл қолжетімсіз.'],
['Language','Язык','Тіл'],
['GROW WITH HALYK','РАСТИ ВМЕСТЕ С HALYK','HALYK-ПЕН БІРГЕ ӨСІҢІЗ'],
['YOUR POTENTIAL. YOUR PACE.','ВАШ ПОТЕНЦИАЛ. ВАШ ТЕМП.','СІЗДІҢ ӘЛЕУЕТІҢІЗ. ӨЗ ҚАРҚЫНЫҢЫЗ.'],
['Good things','Всё лучшее','Жақсылықтың бәрі'],['are ahead.','впереди.','алда.'],
['Turn your next step into a bigger picture.','Посмотрите на свой следующий шаг шире.','Келесі қадамыңызбен жаңа мүмкіндіктерге жол ашыңыз.'],
['A little clarity for your career journey.','Больше ясности на карьерном пути.','Мансап жолыңызды айқындаңыз.'],
['Discover','Открывай','Таныңыз'],['Develop','Развивайся','Дамыңыз'],['Thrive','Достигай','Өркендеңіз'],
['Made for your growth. Built around you.','Создано для вашего развития. С заботой о вас.','Сіздің дамуыңыз үшін. Сізге бейімделген.'],
['HackAlem AI · Halyk track','HackAlem AI · Трек Halyk','HackAlem AI · Halyk бағыты'],
['Your next chapter','Новый этап','Жаңа кезеңіңіз'],['starts here.','начинается здесь.','осы жерден басталады.'],
['Sign in to your personal development space.','Войдите в личное пространство развития.','Жеке даму кеңістігіңізге кіріңіз.'],
['Workspace','Рабочее пространство','Жұмыс кеңістігі'],['Employee','Сотрудник','Қызметкер'],['HR specialist','HR-специалист','HR маманы'],
['Password','Пароль','Құпиясөз'],['Enter your workspace','Войти','Кіру'],
['A safe space to explore','Пространство для новых возможностей','Жаңа мүмкіндіктер кеңістігі'],
['. HR password:','. Пароль HR:','. HR құпиясөзі:'],
['Your development profile stays private.','Ваш профиль развития остаётся закрытым.','Даму профиліңіз құпия сақталады.'],
['PEOPLE & DEVELOPMENT','ЛЮДИ И РАЗВИТИЕ','АДАМДАР ЖӘНЕ ДАМУ'],['YOUR WORKSPACE','ВАШЕ ПРОСТРАНСТВО','СІЗДІҢ КЕҢІСТІГІҢІЗ'],
['Main navigation','Основная навигация','Негізгі навигация'],['Team overview','Обзор команды','Топқа шолу'],
['Data workspace','Управление данными','Деректерді басқару'],['Overview','Обзор','Шолу'],['My growth path','Мой путь развития','Даму жолым'],
['Explore activities','Каталог активностей','Іс-шаралар каталогы'],['My journey','Моя история','Менің тарихым'],['Profile preview','Просмотр профиля','Профильді қарау'],
['Small steps.','Маленькие шаги.','Шағын қадамдар.'],['Meaningful growth.','Значимый рост.','Нәтижелі даму.'],
['Your journey is your own.','У каждого свой путь.','Әркімнің өз жолы бар.'],['Let’s make it a good one.','Пусть он будет интересным.','Жолыңыз жемісті болсын.'],
['Employee workspace','Кабинет сотрудника','Қызметкер кабинеті'],['Sign out','Выйти','Шығу'],['HR access','Доступ HR','HR маманының рұқсаты'],
['Only visible to you & HR','Видно только вам и HR','Тек сізге және HR-ға көрінеді'],
['A little progress, every day.','Каждый день — немного вперёд.','Күн сайын бір қадам алға.'],
['Finding your next step…','Подбираем следующий шаг…','Келесі қадамыңызды іздеудеміз…'],
['Loading your next chapter…','Загружаем ваш новый этап…','Жаңа кезеңіңіз жүктелуде…'],
['Try again','Попробовать снова','Қайталап көру'],['We couldn’t load this workspace.','Не удалось загрузить рабочее пространство.','Жұмыс кеңістігін жүктеу мүмкін болмады.'],
['YOUR NEXT CHAPTER','ВАШ НОВЫЙ ЭТАП','СІЗДІҢ ЖАҢА КЕЗЕҢІҢІЗ'],
['Your ambitions, a clearer path. Here’s where you can grow next.','Ваши цели и понятный путь к ним. Вот направления дальнейшего роста.','Мақсатыңызға апарар айқын жол. Келесі даму бағыттары осында.'],
['HR preview · Read-only employee view.','Просмотр HR · Профиль сотрудника без редактирования.','HR үшін · Қызметкер профилін тек қарауға болады.'],
['Back to team overview','Вернуться к команде','Топқа шолуға оралу'],['YOUR GROWTH PATH','ВАШ ПУТЬ РАЗВИТИЯ','СІЗДІҢ ДАМУ ЖОЛЫҢЫЗ'],
['You’re building your','Вы создаёте свой','Сіз өзіңіздің'],['next chapter.','новый этап.','жаңа кезеңіңізді құрудасыз.'],
['Keep growing.','Продолжайте расти.','Дамуды жалғастырыңыз.'],['Keep exploring.','Открывайте новое.','Жаңаны танып-біліңіз.'],
['One meaningful step at a time.','Один важный шаг за другим.','Әр қадамның өз мәні бар.'],
['You’re at the highest defined grade. Explore skills beyond your current role.','Вы достигли высшего грейда в этой модели. Изучайте навыки за пределами текущей роли.','Бұл үлгідегі ең жоғары грейдке жеттіңіз. Қазіргі рөліңізден тыс дағдыларды зерттеңіз.'],
['See my growth path','Посмотреть мой путь','Даму жолымды көру'],['EXPLORE','ИЗУЧАЙ','ТАНЫҢЫЗ'],['DEVELOP','РАЗВИВАЙСЯ','ДАМЫҢЫЗ'],['THRIVE','ДОСТИГАЙ','ӨРКЕНДЕҢІЗ'],
['Built around your skills, experience & ambitions','С учётом ваших навыков, опыта и целей','Дағдыларыңызға, тәжірибеңізге және мақсатыңызға сай'],
['Your next level','Ваш следующий уровень','Келесі деңгейіңіз'],['Top grade','Высший грейд','Ең жоғары грейд'],['skill readiness','готовность по навыкам','дағдылар бойынша дайындық'],
['to develop for your next grade','нужно развить для следующего грейда','келесі грейд үшін дамыту қажет'],
['Your defined skill targets are met','Целевые уровни навыков достигнуты','Мақсатты дағды деңгейлеріне жеттіңіз'],
['No next-grade target defined','Цель следующего грейда не задана','Келесі грейд мақсаты белгіленбеген'],
['A guide for growth, not a promotion decision.','Ориентир развития, а не решение о повышении.','Даму бағдары, қызметте жоғарылату туралы шешім емес.'],
['Activities completed','Завершено активностей','Аяқталған іс-шаралар'],['Your experience so far','Ваш накопленный опыт','Жинақталған тәжірибеңіз'],
['Steps in progress','Шагов в процессе','Орындалып жатқан қадамдар'],['At your own pace','В своём темпе','Өз қарқыныңызбен'],
['Skills in your toolkit','Навыков в профиле','Профильдегі дағдылар'],['Room to keep growing','Возможности для роста','Даму мүмкіндіктері'],
['Good next steps','Подходящие шаги','Сізге ұсынылатын қадамдар'],['Chosen for where you are — and where you want to go.','С учётом вашего опыта и направления развития.','Тәжірибеңіз бен даму бағытыңызға сай таңдалған.'],
['Explore all activities','Все активности','Барлық іс-шаралар'],['Considering your skill gaps, history and activity formats…','Учитываем навыки, историю и форматы активностей…','Дағдыларды, тарихты және іс-шара форматтарын ескерудеміз…'],
['Skills to take you further','Навыки для следующего шага','Келесі қадамға қажет дағдылар'],['View path','Посмотреть путь','Жолды көру'],
['A MOMENT TO REFLECT','ВРЕМЯ ОГЛЯНУТЬСЯ','ОЙ ЕЛЕГІНЕН ӨТКІЗУ'],['Progress isn’t','Путь развития','Даму жолы'],['always a straight line.','не всегда прямой.','әрдайым түзу болмайды.'],
['Trying something new counts. So does finding out what works for you.','Пробовать новое важно. Как и находить то, что подходит именно вам.','Жаңаны байқап көру маңызды. Өзіңізге сай нәрсені табу да маңызды.'],
['Look back at your journey','Вспомнить свой путь','Өткен жолға көз салу'],
['You’ve met the defined skill targets. Take a moment to enjoy your progress.','Вы достигли целевых уровней навыков. Отметьте свой прогресс.','Дағдылардың мақсатты деңгейіне жеттіңіз. Жетістігіңізді бағалаңыз.'],
['· Critical','· Критический навык','· Маңызды дағды'],['OPENAI RECOMMENDATIONS','РЕКОМЕНДАЦИИ OPENAI','OPENAI ҰСЫНЫСТАРЫ'],
['LOCAL AI RECOMMENDATIONS','РЕКОМЕНДАЦИИ ЛОКАЛЬНОГО ИИ','ЖЕРГІЛІКТІ ЖИ ҰСЫНЫСТАРЫ'],['MULTI-FACTOR RECOMMENDATIONS','МНОГОФАКТОРНЫЕ РЕКОМЕНДАЦИИ','КӨП ФАКТОРЛЫ ҰСЫНЫСТАР'],
['No remaining eligible activities close your next-grade gaps. Explore the activity library for other development opportunities.','Доступных активностей для сокращения разрыва до цели больше нет. Посмотрите другие возможности в каталоге.','Мақсатқа дейінгі алшақтықты азайтатын қолжетімді іс-шаралар қалмады. Каталогтағы басқа мүмкіндіктерді қараңыз.'],
['TOP PICK','ЛУЧШИЙ ВАРИАНТ','ҮЗДІК НҰСҚА'],['A practical opportunity to develop your skills.','Практическая возможность развить навыки.','Дағдыларыңызды дамытудың практикалық мүмкіндігі.'],
['Practice & reinforce','Практика и закрепление','Жаттығу және бекіту'],['Why this step?','Почему этот шаг?','Неге осы қадам?'],['View details','Подробнее','Толығырақ'],
['Preview only','Только просмотр','Тек қарау'],['Completed','Завершено','Аяқталды'],['In progress','В процессе','Орындалуда'],['Join activity','Записаться','Қатысуға жазылу'],
['Activity removed from your plan. Choose a step that works for you.','Активность удалена из плана. Выберите подходящий шаг.','Іс-шара жоспардан алынды. Өзіңізге сай қадамды таңдаңыз.'],
['Added to your plan. Your next step is ready when you are.','Добавлено в план. Приступайте, когда будете готовы.','Жоспарға қосылды. Дайын болғанда бастаңыз.'],
['Close dialog','Закрыть окно','Терезені жабу'],['OpenAI reasoning','Объяснение OpenAI','OpenAI түсіндірмесі'],['Local AI reasoning','Объяснение локального ИИ','Жергілікті ЖИ түсіндірмесі'],
['Model-generated explanation; check the verified evidence below.','Объяснение модели; проверенные факты приведены ниже.','Модель түсіндірмесі; тексерілген деректер төменде берілген.'],
['Why this step fits','Почему это подходит','Неліктен бұл сәйкес келеді'],['What changes when you complete it','Что изменится после завершения','Аяқтағаннан кейін не өзгереді'],
['New level = max(current, min(5, activity cap, current + gain)). Your level never decreases.','Новый уровень = max(текущий, min(5, предел активности, текущий + прирост)). Уровень не снижается.','Жаңа деңгей = max(ағымдағы, min(5, іс-шара шегі, ағымдағы + өсім)). Деңгей төмендемейді.'],
['HR preview is read-only.','HR может только просматривать этот профиль.','HR бұл профильді тек қарай алады.'],['Already completed','Уже завершено','Бұрын аяқталған'],
['Demo: completion is self-reported and immediately updates your skills.','Демо: вы сами отмечаете завершение, и навыки обновляются сразу.','Демо: аяқтауды өзіңіз белгілейсіз, дағдылар бірден жаңарады.'],
['Mark as completed','Отметить завершение','Аяқталды деп белгілеу'],['Leave activity','Отказаться от участия','Қатысудан бас тарту'],['Add to my plan','Добавить в мой план','Жоспарыма қосу'],
['Make your potential visible.','Увидеть свой потенциал.','Әлеуетіңізді көріңіз.'],
['A clearer view of the skills that connect today to your next chapter.','Узнайте, какие навыки приближают вас к новому этапу.','Жаңа кезеңге жақындататын дағдыларды біліңіз.'],
['WHERE YOU ARE','ГДЕ ВЫ СЕЙЧАС','ҚАЗІРГІ ДЕҢГЕЙІҢІЗ'],['WHAT YOU’RE WORKING TOWARD','К ЧЕМУ ВЫ СТРЕМИТЕСЬ','СІЗ ҰМТЫЛАТЫН МАҚСАТ'],
['Continued mastery','Дальнейшее мастерство','Шеберлікті жетілдіру'],['No target requirements defined','Целевые требования не заданы','Мақсатты талаптар белгіленбеген'],
['Your skill map','Карта ваших навыков','Дағдыларыңыздың картасы'],['Current','Текущий','Ағымдағы'],['Target','Цель','Мақсат'],['Progress you can understand','Понятный прогресс','Түсінікті ілгерілеу'],
['Readiness = the sum of current levels, capped at each target, divided by the sum of target levels. Only skills tracked in your profile or explicitly required for your role are included. Readiness is a development guide, not an automatic promotion decision.','Готовность — сумма текущих уровней, ограниченных целевыми, делённая на сумму целевых уровней. Учитываются навыки профиля и требования к целевой роли. Это ориентир развития, а не автоматическое решение о повышении.','Дайындық — мақсатты деңгеймен шектелген ағымдағы деңгейлер қосындысының мақсатты деңгейлер қосындысына қатынасы. Профильдегі және мақсатты рөлге қажет дағдылар ескеріледі. Бұл — даму бағдары, қызметте автоматты түрде жоғарылату туралы шешім емес.'],
['Your next step is yours to choose.','Следующий шаг выбираете вы.','Келесі қадамды өзіңіз таңдайсыз.'],
['Browse voluntary opportunities that fit your goals and your schedule.','Найдите добровольные активности под свои цели и график.','Мақсатыңыз бен кестеңізге сай, өз еркіңізбен қатысатын іс-шараларды табыңыз.'],
['MAKE ROOM TO GROW','ПРОСТРАНСТВО ДЛЯ РОСТА','ДАМУҒА ОРЫН БЕРІҢІЗ'],['Find your next spark.','Найдите новый источник вдохновения.','Жаңа шабыт көзін табыңыз.'],
['Workshops, mentoring and practical experiences. Choose what works for you.','Практикумы, наставничество и новый опыт. Выбирайте подходящее.','Практикумдар, тәлімгерлік және жаңа тәжірибе. Өзіңізге сай нұсқаны таңдаңыз.'],
['All activities','Все активности','Барлық іс-шаралар'],['My plan','Мой план','Менің жоспарым'],['Search activities','Поиск активностей','Іс-шараларды іздеу'],
['No matching activities. Try another filter or add an activity to your plan.','Подходящих активностей нет. Измените фильтр или добавьте активность в план.','Сәйкес іс-шаралар жоқ. Сүзгіні өзгертіңіз немесе жоспарға іс-шара қосыңыз.'],
['EVERY STEP TELLS A STORY','У КАЖДОГО ШАГА СВОЯ ИСТОРИЯ','ӘР ҚАДАМНЫҢ ӨЗ ТАРИХЫ БАР'],['Look how far you’ve come.','Посмотрите, какой путь вы прошли.','Қандай жетістіктерге жеткеніңізді көріңіз.'],
['Your development history, without comparisons or leaderboards.','Ваша история развития без сравнений и рейтингов.','Салыстырусыз және рейтингсіз даму тарихыңыз.'],
['Did not attend','Не участвовал(а)','Қатыспады'],['Chose not to attend','Отказ от участия','Қатысудан бас тартты'],['Registered','Запись оформлена','Тіркелді'],
['Left before completing','Участие прервано','Аяқтамай тоқтатты'],['Overdue','Просрочено','Мерзімі өтті'],['· On time','· Вовремя','· Уақытында'],
['Your story starts with your first activity.','Ваша история начинается с первой активности.','Тарихыңыз алғашқы іс-шарадан басталады.'],
['HELP YOUR PEOPLE THRIVE','ПОМОГАЙТЕ КОМАНДЕ РАСТИ','ТОПТЫҢ ДАМУЫНА КӨМЕКТЕСІҢІЗ'],['Growth starts with understanding.','Развитие начинается с понимания.','Даму түсінуден басталады.'],
['See where support can make a difference. Give every journey room to grow.','Узнайте, где нужна поддержка. Дайте каждому возможность расти.','Қай жерде қолдау қажет екенін біліңіз. Әркімге дамуға мүмкіндік беріңіз.'],
['Import dataset','Импорт данных','Деректерді импорттау'],['People in your workspace','Сотрудников в системе','Жүйедегі қызметкерлер'],['Synthetic employee profiles','Синтетические профили','Синтетикалық профильдер'],
['Active in development','Участвуют в развитии','Дамуға қатысуда'],['Completed an activity in 90 days','Завершили активность за 90 дней','Соңғы 90 күнде іс-шара аяқтағандар'],
['Activity completion','Завершение активностей','Іс-шараларды аяқтау'],['Across records in the last 90 days','По записям за последние 90 дней','Соңғы 90 күндегі жазбалар бойынша'],
['May benefit from support','Может пригодиться поддержка','Қолдау қажет болуы мүмкін'],['A conversation, not a risk label','Повод для разговора, не оценка риска','Әңгімелесуге негіз, тәуекел бағасы емес'],
['Where to invest in growth','Куда направить поддержку','Қолдауды қайда бағыттау керек'],
['Skills below next-grade requirements across applicable profiles.','Навыки ниже требований целевого грейда в соответствующих профилях.','Тиісті профильдердегі мақсатты грейд талабына жетпейтін дағдылар.'],
['Team skill gaps','Дефициты навыков команды','Топ дағдыларындағы алшақтық'],['People & their paths','Люди и их пути','Адамдар және олардың жолдары'],
['Alphabetical view · visible only to HR','По алфавиту · видно только HR','Әліпбилік ретпен · тек HR-ға көрінеді'],['Find a colleague','Найти сотрудника','Қызметкерді іздеу'],
['Everyone','Все','Барлығы'],['May need support','Нужна поддержка','Қолдау қажет'],['Colleague','Сотрудник','Қызметкер'],['Department','Подразделение','Бөлім'],
['Current grade','Текущий грейд','Ағымдағы грейд'],['Skill readiness','Готовность по навыкам','Дағдылар бойынша дайындық'],['Development','Развитие','Даму'],['Open profile','Открыть профиль','Профильді ашу'],
['Support signals reflect activity history, not employee performance or attrition predictions.','Сигналы поддержки основаны на истории участия, а не на оценке эффективности или прогнозе увольнения.','Қолдау сигналдары қатысу тарихына негізделген, тиімділік бағасы немесе жұмыстан кету болжамы емес.'],
['Unassigned','Не указано','Көрсетілмеген'],['Recent completed activity','Есть недавнее завершение','Жақында аяқталған іс-шара бар'],['Offer support','Предложить поддержку','Қолдау ұсыну'],['Active','Активен','Белсенді'],
['No matching colleagues.','Сотрудники не найдены.','Қызметкерлер табылмады.'],
['BRING THE BIGGER PICTURE','СОБЕРИТЕ ПОЛНУЮ КАРТИНУ','ТОЛЫҚ КӨРІНІСТІ ҚҰРАСТЫРЫҢЫЗ'],['A home for your development data.','Все данные о развитии в одном месте.','Даму деректері бір жерде.'],
['Import starter-kit or jury profiles and history. Validate everything before applying it.','Загрузите стартовый набор или профили и историю жюри. Проверьте данные перед применением.','Бастапқы жинақты немесе қазылар ұсынған профильдер мен қатысу тарихын жүктеңіз. Қолданбас бұрын деректерді тексеріңіз.'],
['Upload a dataset','Загрузить данные','Деректерді жүктеу'],
['Select a combined JSON dataset, or select the starter-kit files together. Maximum request size: 8 MB.','Выберите общий JSON или файлы стартового набора вместе. Максимальный размер запроса — 8 МБ.','Біріктірілген JSON немесе бастапқы жинақ файлдарын бірге таңдаңыз. Сұрау шегі — 8 МБ.'],
['Choose your dataset files','Выберите файлы данных','Деректер файлдарын таңдаңыз'],['JSON or CSV · you can select multiple files','JSON или CSV · можно выбрать несколько файлов','JSON немесе CSV · бірнеше файл таңдауға болады'],
['Validate files','Проверить файлы','Файлдарды тексеру'],['Import validated data','Импортировать проверенные данные','Тексерілген деректерді импорттау'],
['Jury-ready workflow','Готово к проверке жюри','Қазылардың тексеруіне дайын'],['Connect the context.','Объедините контекст.','Деректерді өзара байланыстырыңыз.'],
['Role, grade, tenure and current skill levels.','Роль, грейд, стаж и текущие уровни навыков.','Рөл, грейд, еңбек өтілі және дағды деңгейлері.'],
['Audience, activity type, skill gains and caps.','Аудитория, тип активности, прирост и пределы навыков.','Аудитория, іс-шара түрі, дағды өсімі мен шектері.'],
['Skill definitions and grade requirements.','Определения навыков и требования грейдов.','Дағды анықтамалары және грейд талаптары.'],
['Participation, no-shows and declined activities.','Участие, неявки и отказы.','Қатысу, келмеу және бас тарту.'],
['Profiles, skills and events merge by ID. Uploaded history replaces the history of employees represented in that file. For starter-kit profiles, completed activities dated after the last review are applied once to the assessment baseline, respecting skill caps.','Профили, навыки и активности объединяются по ID. История заменяется для сотрудников из загруженного файла. Для стартовых профилей завершения после последней оценки применяются к базовым навыкам один раз с учётом ограничений.','Профильдер, дағдылар және іс-шаралар ID бойынша біріктіріледі. Тарих жүктелген файлдағы қызметкерлер үшін ауыстырылады. Бастапқы профильдерде соңғы бағалаудан кейінгі аяқтаулар шектерді ескеріп, базалық дағдыларға бір рет қолданылады.'],
['Download current dataset','Скачать текущие данные','Ағымдағы деректерді жүктеп алу'],['Your data & AI provider','Ваши данные и провайдер ИИ','Деректеріңіз және ЖИ провайдері'],
['Dataset files are stored on this server.','Файлы данных хранятся на этом сервере.','Деректер файлдары осы серверде сақталады.'],
['OpenAI mode sends role, skills, career goals and activity evidence to the OpenAI API. Employee names, IDs and raw history are excluded.','В режиме OpenAI отправляются роль, навыки, карьерные цели и факты об активностях. Имена, ID сотрудников и исходная история не передаются.','OpenAI режимінде рөл, дағдылар, мансаптық мақсаттар және іс-шара деректері жіберіледі. Есімдер, қызметкер ID-лері және бастапқы тарих жіберілмейді.'],
['Recommendations use local rules or a locally configured Ollama model.','Рекомендации используют локальные правила или локальную модель Ollama.','Ұсыныстар жергілікті ережелерді немесе Ollama моделін пайдаланады.'],
['Select files totaling at most 7 MB (8 MB request limit).','Выберите файлы общим размером до 7 МБ (лимит запроса — 8 МБ).','Жалпы көлемі 7 МБ-қа дейінгі файлдарды таңдаңыз (сұрау шегі — 8 МБ).'],
['Dataset imported successfully.','Данные успешно импортированы.','Деректер сәтті импортталды.'],
['Open Team overview to inspect imported profiles.','Откройте обзор команды для просмотра загруженных профилей.','Жүктелген профильдерді көру үшін «Топқа шолу» бөлімін ашыңыз.'],
['Request failed.','Не удалось выполнить запрос.','Сұрау орындалмады.'],['Failed to fetch','Не удалось связаться с сервером.','Сервермен байланысу мүмкін болмады.'],
['Please sign in to continue.','Войдите, чтобы продолжить.','Жалғастыру үшін кіріңіз.'],['Incorrect username or password.','Неверный логин или пароль.','Логин немесе құпиясөз қате.'],
['Too many attempts. Try again in a minute.','Слишком много попыток. Повторите через минуту.','Кіру әрекеттері тым көп. Бір минуттан кейін қайталаңыз.'],
['You can only access your own development profile.','Доступен только ваш профиль развития.','Тек өз даму профиліңізге қол жеткізе аласыз.'],
['Employee profile not found.','Профиль сотрудника не найден.','Қызметкер профилі табылмады.'],['HR access is required.','Требуется доступ HR.','HR маманының рұқсаты қажет.'],
['Profile data changed during recommendation. Please refresh.','Данные изменились во время подбора. Обновите страницу.','Ұсыныс дайындау кезінде деректер өзгерді. Бетті жаңартыңыз.'],
['Data changed since validation. Validate your files again.','После проверки данные изменились. Проверьте файлы снова.','Тексеруден кейін деректер өзгерді. Файлдарды қайта тексеріңіз.'],
['Activity already completed.','Активность уже завершена.','Іс-шара бұрын аяқталған.'],['This activity has already been completed.','Эта активность уже завершена.','Бұл іс-шара бұрын аяқталған.'],
['Join the activity before completing it.','Сначала запишитесь на активность.','Алдымен іс-шараға тіркеліңіз.'],
['This activity is not available for this profile.','Эта активность недоступна для профиля.','Бұл іс-шара профильге қолжетімсіз.'],
['Activity unavailable: check role, grade, prerequisites and session availability.','Активность недоступна: проверьте роль, грейд, требования и расписание.','Іс-шара қолжетімсіз: рөлді, грейдті, талаптарды және кестені тексеріңіз.'],
['No remaining sessions available.','Доступных сессий больше нет.','Қолжетімді сессиялар қалмады.'],
['This session has already been completed.','Эта сессия уже завершена.','Бұл сессия бұрын аяқталған.'],
['A new skill-development direction; no participation history for these skills yet.','Новое направление развития: истории участия по этим навыкам пока нет.','Жаңа даму бағыты: бұл дағдылар бойынша қатысу тарихы әлі жоқ.'],
['Your current skills meet every prerequisite for this activity.','Ваши навыки соответствуют всем предварительным требованиям.','Дағдыларыңыз барлық бастапқы талаптарға сай.'],
['This activity is in person; you usually work remotely. Check whether attendance is practical.','Активность очная, а вы обычно работаете удалённо. Проверьте возможность участия.','Іс-шара офлайн өтеді, ал сіз әдетте қашықтан жұмыс істейсіз. Қатысу мүмкіндігін тексеріңіз.'],
['Your last two completed activities were finished on time.','Две последние завершённые активности выполнены вовремя.','Соңғы екі аяқталған іс-шара уақытында орындалды.'],
['You have skipped similar activities before. Choose this only if the format works for you.','Ранее вы пропускали похожие активности. Выбирайте эту, если формат вам подходит.','Бұрын ұқсас іс-шараларға қатыспағансыз. Формат қолайлы болса ғана таңдаңыз.'],
['Repeated missed or declined activities in 90 days','Повторные неявки или отказы за 90 дней','Соңғы 90 күнде бірнеше іс-шараға келмеген немесе қатысудан бас тартқан'],
['No completed activity in 90 days','Нет завершений за 90 дней','Соңғы 90 күнде аяқталған іс-шара жоқ'],
['Transparent multi-factor scoring. Configure OPENAI_API_KEY or OLLAMA_MODEL for AI selection.','Прозрачная многофакторная оценка. Для ИИ настройте OPENAI_API_KEY или OLLAMA_MODEL.','Түсінікті көп факторлы бағалау. ЖИ үшін OPENAI_API_KEY немесе OLLAMA_MODEL орнатыңыз.'],
['workshop','практикум','практикум'],['course','курс','курс'],['mentoring','наставничество','тәлімгерлік'],['lab','лаборатория','зертхана'],['challenge','испытание','сынақ'],
['certification','сертификация','сертификаттау'],['meetup','встреча','кездесу'],['compliance','обязательное обучение','міндетті оқу'],['onboarding','адаптация','бейімделу'],
['online','онлайн','онлайн'],['offline','очно','офлайн'],['self_paced','самостоятельно','өз қарқынымен'],['self paced','самостоятельно','өз қарқынымен'],
['Junior','Начальный','Бастапқы'],['Middle','Средний','Орта'],['Senior','Старший','Аға'],['Lead','Ведущий','Жетекші'],
['Backend Engineer','Бэкенд-разработчик','Бэкенд әзірлеуші'],['Frontend Engineer','Фронтенд-разработчик','Фронтенд әзірлеуші'],['Data Analyst','Аналитик данных','Деректер талдаушысы'],['QA Engineer','Инженер по тестированию','Тестілеу инженері'],['Product Manager','Менеджер продукта','Өнім менеджері'],['HR Business Partner','HR-бизнес-партнёр','HR бизнес-серіктес'],['Sales Manager','Менеджер по продажам','Сату менеджері'],['Customer Support Specialist','Специалист поддержки','Қолдау маманы'],
];
rows.forEach(row => add(...row));
// Validation details are prefixed with a record ID by the server.
const validationDetails = [
['duplicate IDs.','повторяются ID.','ID мәндері қайталанады.'],
['duplicate IDs in upload.','повторяются ID в загрузке.','жүктелген деректерде ID мәндері қайталанады.'],
['invalid ID.','неверный ID.','ID мәні қате.'],
['name and grade requirements are required.','нужны название и требования грейдов.','атауы мен грейд талаптары көрсетілуі керек.'],
['grade requirement must be 0–5.','требование грейда должно быть от 0 до 5.','грейд талабы 0–5 аралығында болуы керек.'],
['invalid role requirements.','неверные требования роли.','рөл талаптары қате.'],
['invalid grade requirement.','неверное требование грейда.','грейд талабы қате.'],
['valid role, grade and tenure_months required.','нужны корректные роль, грейд и tenure_months.','рөл, грейд және tenure_months дұрыс көрсетілуі керек.'],
['name and department must be nonempty text when supplied.','имя и подразделение не должны быть пустыми.','аты-жөні мен бөлім атауы берілсе, бос мәтін болмауы керек.'],
['skills must be an object.','skills должен быть объектом.','skills объект түрінде болуы керек.'],
['invalid last_review_date.','неверная дата last_review_date.','last_review_date күні қате.'],
['invalid assessed skill.','неверная оценка навыка.','дағдының бағасы қате.'],
['invalid career goal.','неверная карьерная цель.','мансаптық мақсат қате.'],
['unknown role/grade.','неизвестная роль или грейд.','белгісіз рөл немесе грейд.'],
['unknown career target.','неизвестная карьерная цель.','белгісіз мансаптық мақсат.'],
['title, type, audience array and positive duration_hours required.','нужны название, тип, массив аудитории и положительное duration_hours.','атауы, түрі, қатысушылар массиві және нөлден үлкен duration_hours мәні қажет.'],
['invalid grades.','неверные грейды.','грейдтер қате.'],
['voluntary must be boolean.','voluntary должен быть логическим значением.','voluntary логикалық мән болуы керек.'],
['description must be text of up to 5,000 characters.','описание должно быть текстом до 5000 символов.','сипаттама 5000 таңбадан аспайтын мәтін болуы керек.'],
['unique skill gains required (empty allowed for mandatory events).','нужны уникальные приросты навыков (можно оставить пустыми для обязательных активностей).','дағды өсімдері қайталанбауы керек (міндетті іс-шаралар үшін бос болуы мүмкін).'],
['invalid skill, gain or max_level.','неверный навык, gain или max_level.','дағды, gain немесе max_level мәні қате.'],
['prerequisites must be an object.','prerequisites должен быть объектом.','prerequisites объект түрінде болуы керек.'],
['invalid prerequisite.','неверное предварительное требование.','алдын ала қойылатын талап қате.'],
['invalid format.','неверный формат.','формат қате.'],
['invalid session date.','неверная дата занятия.','сабақ күні қате.'],
];
validationDetails.forEach(row => add(...row));
catalog.forEach(row => add(...row));
for (const type of ['workshop','course','mentoring','lab','challenge','certification','meetup','compliance','onboarding']) {
  const entry = messages[type]; add(type[0].toUpperCase()+type.slice(1), entry.ru[0].toUpperCase()+entry.ru.slice(1), entry.kk[0].toUpperCase()+entry.kk.slice(1));
}

export function translateText(value, language = 'en') {
  const lang = normalizeLanguage(language);
  if (lang === 'en' || !value.trim()) return value;
  const text = value.trim();
  const exact = messages[text]?.[lang];
  const translated = exact ?? dynamic(text, lang);
  return value.slice(0, value.indexOf(text)) + translated + value.slice(value.indexOf(text) + text.length);
}
const choose = (lang, ru, kk) => lang === 'ru' ? ru : kk;
function dynamic(text, lang) {
  const tr = value => translateText(value, lang);
  let m;
  if ((m = text.match(/^Guided practice: (.+) · level ([1-5])$/))) return choose(lang, `Практическое задание: ${tr(m[1])} · уровень ${m[2]}`, `Практикалық тапсырма: ${tr(m[1])} · ${m[2]}-деңгей`);
  if (text.startsWith('Validation passed.')) {
    for (const suffix of [' Restoring this backup replaces all current data and personal plans.', ' Duplicate completions do not grant extra skill gains.', ' Additional guided practice will be added to cover catalog gaps.']) {
      if (text.endsWith(suffix)) return tr(text.slice(0, -suffix.length)) + ' ' + tr(suffix.trim());
    }
  }
  if ((m = text.match(/^([A-Za-z0-9_-]+): (mandatory|recurring) must be boolean\.$/))) return choose(lang, `${m[1]}: ${m[2]} должно быть логическим значением.`, `${m[1]}: ${m[2]} логикалық мән болуы керек.`);
  if ((m = text.match(/^([A-Za-z0-9_-]+): (.+)$/)) && messages[m[2]]) return `${m[1]}: ${tr(m[2])}`;
  if ((m = text.match(/^([A-Za-z0-9_-]+): invalid or missing (.+)\.$/))) return choose(lang, `${m[1]}: отсутствует или некорректно ${m[2]}.`, `${m[1]}: ${m[2]} мәні жоқ немесе қате.`);
  if ((m = text.match(/^([A-Za-z0-9_-]+): unknown skill or level outside 0–5: (.+)\.$/))) return choose(lang, `${m[1]}: неизвестный навык или уровень вне 0–5: ${m[2]}.`, `${m[1]}: белгісіз дағды немесе 0–5 аралығынан тыс деңгей: ${m[2]}.`);
  if ((m = text.match(/^(.+) · Critical$/))) return `${tr(m[1])} ${tr('· Critical')}`;
  if ((m = text.match(/^Unsupported filename: (.+)\.$/))) return choose(lang, `Неподдерживаемое имя файла: ${m[1]}.`, `Бұл файл атауына қолдау көрсетілмейді: ${m[1]}.`);
  if ((m = text.match(/^Duplicate (.+) file\.$/))) return choose(lang, `Повторяется файл ${m[1]}.`, `${m[1]} файлы қайталанады.`);
  if ((m = text.match(/^Role profile refers to unknown skill (.+)\.$/))) return choose(lang, `В профиле роли неизвестный навык: ${m[1]}.`, `Рөл профилінде белгісіз дағды көрсетілген: ${m[1]}.`);
  if ((m = text.match(/^CSV row (\d+) has (\d+) fields; expected (\d+)\.$/))) return choose(lang, `Строка CSV ${m[1]}: ${m[2]} полей, требуется ${m[3]}.`, `CSV файлының ${m[1]}-жолында ${m[2]} өріс бар; ${m[3]} өріс болуы керек.`);
  if ((m = text.match(/^(.+) must be an array or a (.+) wrapper\.$/))) return choose(lang, `${m[1]}: нужен массив или объект с полем ${m[2]}.`, `${m[1]}: массив немесе ${m[2]} өрісі бар объект болуы керек.`);
  if ((m = text.match(/^(.+) must be a nonempty array \(up to 10,000 rows\)\.$/))) return choose(lang, `${m[1]}: нужен непустой массив до 10 000 строк.`, `${m[1]}: 10 000 жолдан аспайтын, бос емес массив болуы керек.`);
  if ((m = text.match(/^(.+) must be an (array|object)( of up to 100,000 rows)?\.$/))) return choose(lang, `${m[1]}: требуется ${m[2] === 'array' ? 'массив' : 'объект'}${m[3] ? ' до 100 000 строк' : ''}.`, `${m[1]}: ${m[3] ? '100 000 жолдан аспайтын ' : ''}${m[2] === 'array' ? 'массив' : 'объект'} болуы керек.`);
  if ((m = text.match(/^Invalid history (.+)\.$/))) return choose(lang, `Некорректное поле истории: ${m[1]}.`, `Қатысу тарихындағы өріс қате: ${m[1]}.`);
  if ((m = text.match(/^A little closer, (.+)\.$/))) return choose(lang, `Ещё на шаг ближе, ${m[1]}.`, `Тағы бір қадам жақындадыңыз, ${m[1]}.`);
  if ((m = text.match(/^Employee · (.+)$/))) return `${tr('Employee')} · ${m[1]}`;
  if ((m = text.match(/^(.+) \+(\d+)$/)) && messages[m[1]]) return `${tr(m[1])} +${m[2]}`;
  if ((m = text.match(/^(Completed|In progress|Did not attend|Chose not to attend|Overdue|Registered|Left before completing)( · On time)?$/))) return tr(m[1]) + (m[2] ? ' ' + tr('· On time') : '');
  if ((m = text.match(/^This workspace uses (\d+) synthetic profiles\. Employee password:$/))) return choose(lang, `В системе ${m[1]} синтетических профилей. Пароль сотрудника:`, `Жүйеде ${m[1]} синтетикалық профиль бар. Қызметкер құпиясөзі:`);
  if ((m = text.match(/^Synthetic dataset(.*)$/))) return choose(lang, 'Синтетические данные', 'Синтетикалық деректер') + m[1];
  if ((m = text.match(/^(\d+) (skills|opportunities for you|recorded activities|colleagues)$/))) return m[1] + ' ' + choose(lang, {skills:'навыков','opportunities for you':'возможностей для вас','recorded activities':'записей об активностях',colleagues:'сотрудников'}[m[2]], {skills:'дағды','opportunities for you':'даму мүмкіндігі','recorded activities':'іс-шара жазбасы',colleagues:'қызметкер'}[m[2]]);
  if ((m = text.match(/^\/ (\d+) target$/))) return choose(lang, `/ ${m[1]} цель`, `/ ${m[1]} мақсат`);
  if ((m = text.match(/^Target level (\d+)$/))) return choose(lang, `Целевой уровень ${m[1]}`, `Мақсатты деңгей ${m[1]}`);
  if ((m = text.match(/^From (.+) to (.+)\.$/))) return choose(lang, `От ${terms(m[1],lang)} к ${terms(m[2],lang)}.`, `Қазіргі деңгейіңіз: ${terms(m[1],lang)}. Мақсатыңыз: ${terms(m[2],lang)}.`);
  if ((m = text.match(/^(\d+) months of experience here$/))) return choose(lang, `Стаж в компании: ${m[1]} мес.`, `Компаниядағы еңбек өтілі: ${m[1]} ай`);
  if ((m = text.match(/^(\d+)% of defined skill requirements met · (\d+) critical gaps$/))) return choose(lang, `Выполнено ${m[1]}% требований · критических разрывов: ${m[2]}`, `Дағды талаптарының орындалуы: ${m[1]}% · маңызды дағдылар бойынша алшақтық саны: ${m[2]}`);
  if ((m = text.match(/^Current levels and the requirements for (.+)\.$/))) return choose(lang, `Текущие уровни и требования для ${terms(m[1],lang)}.`, `Ағымдағы дағды деңгейлері. Талаптар: ${terms(m[1],lang)}.`);
  if ((m = text.match(/^Assessment: (.+)\. (\d+) completed activities after that date are reflected in current levels\. Snapshot: (.+)\.$/))) return choose(lang, `Оценка: ${localizeDates(m[1],lang)}. Учтено завершений после оценки: ${m[2]}. Срез: ${m[3]}.`, `Бағалау күні: ${localizeDates(m[1],lang)}. Сол күннен кейін аяқталған ${m[2]} іс-шара ағымдағы деңгейлерде ескерілген. Деректердің күні: ${tr(m[3])}.`);
  if ((m = text.match(/^(\d+) \/ (\d+) people$/))) return choose(lang, `${m[1]} / ${m[2]} сотрудников`, `${m[1]} / ${m[2]} қызметкер`);
  if ((m = text.match(/^(\d+)% below their target$/))) return choose(lang, `${m[1]}% ниже целевого уровня`, `${m[1]}% мақсатты деңгейге жетпеген`);
  if ((m = text.match(/^View (.+) profile$/))) return choose(lang, `Открыть профиль: ${m[1]}`, `Профильді ашу: ${m[1]}`);
  if ((m = text.match(/^(.+) · ([\d.]+) HOURS · VOLUNTARY$/))) return `${tr(m[1])} · ${m[2]} ${choose(lang,'ЧАС. · ДОБРОВОЛЬНО','САҒ. · ҚАТЫСУ ЕРІКТІ')}`;
  if ((m = text.match(/^([\d.]+)h$/))) return m[1] + choose(lang,' ч',' сағ');
  if ((m = text.match(/^Gain (\d+), activity cap (\d+), scale 0–5$/))) return choose(lang, `Прирост ${m[1]}, предел активности ${m[2]}, шкала 0–5`, `Өсім ${m[1]}, іс-шара шегі ${m[2]}, шкала 0–5`);
  if ((m = text.match(/^Multi-factor score: ([-\d.]+)\. Considers gap closure, gap size, participation history, format and effort\.$/))) return choose(lang, `Многофакторная оценка: ${m[1]}. Учитывает сокращение и размер разрыва, историю, формат и трудозатраты.`, `Көп факторлы баға: ${m[1]}. Алшақтық көлемі мен қысқаруы, тарих, формат және уақыт ескеріледі.`);
  if ((m = text.match(/^Step completed\. (\d+) skill\(s\) progressed\. Your path is updated\.$/))) return choose(lang, `Шаг завершён. Улучшено навыков: ${m[1]}. Ваш путь обновлён.`, `Қадам аяқталды. Жақсарған дағдылар: ${m[1]}. Даму жолы жаңарды.`);
  if ((m = text.match(/^Validation passed\. Result: (\d+) profiles, (\d+) events, (\d+) skills and (\d+) history records\. Ready to import\.$/))) return choose(lang, `Проверка пройдена: ${m[1]} профилей, ${m[2]} активностей, ${m[3]} навыков, ${m[4]} записей истории. Можно импортировать.`, `Тексеру сәтті: ${m[1]} профиль, ${m[2]} іс-шара, ${m[3]} дағды, ${m[4]} тарих жазбасы. Импорттауға дайын.`);
  if ((m = text.match(/^(.+): (\d+)\/(\d+) for (.+?)( \(critical requirement\))?; this activity takes you to (\d+)\/(\d+)\.$/))) return choose(lang, `${tr(m[1])}: ${m[2]}/${m[3]} для ${terms(m[4],lang)}${m[5] ? ' (критическое требование)' : ''}; после активности — ${m[6]}/${m[7]}.`, `${tr(m[1])}: ${terms(m[4],lang)} үшін ${m[2]}/${m[3]}${m[5] ? ' (маңызды талап)' : ''}; іс-шарадан кейін — ${m[6]}/${m[7]}.`);
  if ((m = text.match(/^(\d+) completed and (\d+) skipped or declined activities developing the same skills\.$/))) return choose(lang, `По этим навыкам: завершено ${m[1]}, пропущено или отклонено ${m[2]} активностей.`, `Осы дағдыларды дамытатын ${m[1]} іс-шара аяқталған; ${m[2]} іс-шараға қатыспағансыз немесе қатысудан бас тартқансыз.`);
  if ((m = text.match(/^(\d+)% completion across (\d+) previous (.+) activities\.$/))) return choose(lang, `Завершено ${m[1]}% из ${m[2]} предыдущих активностей формата «${tr(m[3])}».`, `«${tr(m[3])}» форматындағы алдыңғы іс-шаралар саны: ${m[2]}. Аяқталған үлесі: ${m[1]}%.`);
  if ((m = text.match(/^Try a (.+) format in ([\d.]+) hours\.$/))) return choose(lang, `Попробуйте формат «${tr(m[1])}»: ${m[2]} ч.`, `«${tr(m[1])}» форматын байқап көріңіз: ${m[2]} сағ.`);
  if ((m = text.match(/^Selected by (.+)\. Verified evidence and skill calculations are shown separately\.$/))) return choose(lang, `Выбрано ${m[1] === 'OpenAI' ? 'OpenAI' : 'локальной моделью'}. Проверенные факты и расчёты навыков показаны отдельно.`, `${m[1] === 'OpenAI' ? 'OpenAI' : 'Жергілікті модель'} таңдады. Тексерілген деректер мен дағды есептері бөлек көрсетілген.`);
  if (/Showing multi-factor recommendations\.$/.test(text)) {
    const reason = text.includes('authentication failed') ? choose(lang,'Ошибка авторизации ИИ: проверьте API-ключ сервера.','ЖИ қызметіне кіру қатесі: сервердегі API кілтін тексеріңіз.') : text.includes('quota or rate limit') ? choose(lang,'Достигнут лимит запросов или квоты ИИ.','ЖИ қызметінің сұрау саны немесе квота шегіне жеттіңіз.') : text.includes('not configured') ? choose(lang,'ИИ не настроен.','ЖИ бапталмаған.') : choose(lang,'ИИ недоступен или вернул некорректный ответ.','ЖИ қолжетімсіз немесе қате жауап берді.');
    return reason + choose(lang,' Показаны многофакторные рекомендации.',' Көп факторлы ұсыныстар көрсетілген.');
  }
  if (text.startsWith('Format: ')) return localizeDates(terms(text.replace('Format:',choose(lang,'Формат:','Формат:')).replace('Recurring activity',choose(lang,'Регулярная активность','Қайталанатын іс-шара')).replace('Next sessions:',choose(lang,'Ближайшие сессии:','Келесі сессиялар:')),lang),lang);
  // Long paragraphs can combine a fixed prefix with a provider-specific sentence.
  for (const prefix of ['Dataset files are stored on this server.','Dataset imported successfully.']) if (text.startsWith(prefix+' ')) return tr(prefix)+' '+tr(text.slice(prefix.length+1));
  const converted = terms(text, lang);
  return localizeDates(converted, lang);
}
function terms(text, lang) {
  // Only known role/grade/format tokens in composite UI labels; preserve IDs and names.
  const keys = ['your current grade','Backend Engineer','Frontend Engineer','Data Analyst','QA Engineer','Product Manager','HR Business Partner','Sales Manager','Customer Support Specialist','Junior','Middle','Senior','Lead','self paced','self_paced','online','offline'];
  for (const key of keys) text = text.replace(new RegExp(`\\b${key}\\b`,'g'), messages[key][lang]);
  return text;
}
export function localizeDates(text, lang) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  // Some runtimes lack Kazakh locale data and display numeric CLDR placeholders (M10).
  const kazakhMonths = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
  return text.replace(/\b(\d{1,2}) (Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (\d{4})\b/g, (_,day,month,year) => {
    const index = months.findIndex(m => m.slice(0,3) === month.slice(0,3));
    if (normalizeLanguage(lang) === 'kk') return `${Number(day)} ${kazakhMonths[index]} ${year} жыл`;
    return new Date(Date.UTC(+year,index,+day)).toLocaleDateString(locales[normalizeLanguage(lang)],{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  });
}
