// Виджет прогноз погоды с помощью класса, fetch и API 

class WeatherWidget {
    constructor(container) {
        // Главный контейнер
        this.container = container;
        // Главная панель погоды
        this.mainWeatherBlock = document.createElement('div');
        // Текущий город, выбранный в главной панели, для получения погодных данных
        this.currentCity = "Киев";
        // Часовой пояс и ID - для часов текущего города
        this.timezone;
        this.clockId = null;
        /* Список добавленных городов, поле для записи результатов поиска, 
        Таймер для autocomplete-поиска и флаг для отмены поиска (для плавной работы autocomplete)*/
        this.listOfAddedCities = document.createElement('div');
        this.citySearchResult = null;
        this.autocompleteTimer = null;
        this.isSearchCancelled = false;
        // Форма и поле ввода поиска городов
        this.citySearchForm = document.createElement('form');
        this.citySearchInput = document.createElement('input');
        // Обработчики событий:
        this.eventClickHandlers = this.eventClickHandlers.bind(this);
        this.formSubmitHandler = this.formSubmitHandler.bind(this);
        this.inputFocusHandler = this.inputFocusHandler.bind(this);
        this.inputBlurHandler = this.inputBlurHandler.bind(this);
        this.inputAutocompleteHandler = this.inputAutocompleteHandler.bind(this);
        // Инициализация
        this.init();
    }

    async init() {
        // Создаем разметку
        this.renderMainWeatherBlock();
        // Получаем данные по текущему городу из главной панели
        let weatherData = await this.fetchWeather();
        // Наполняем разметку данными
        await this.updateWeatherData(weatherData);
        // Инициализация обработчиков
        this.initEventHandlers();
        // Часы 
        this.clockRender(this.mainWeatherBlock.querySelector('[data-clock-container]'), weatherData);
    }

    cityWeatherData = {
        "Киев": { latitude: 50.450001, longitude: 30.523333 },
    }

    sortCities() {
        // Сортировать города в алфавитном порядке, для отрисовки списка
        this.cityWeatherData = Object.fromEntries(
                Object.entries(this.cityWeatherData)
                    .sort( ([keyA], [keyB]) => keyA.localeCompare(keyB) )
        )
    }

    renderCityManagementPane() {
        // Основная панель управления городами
        const cityManagementPane = document.createElement('div');
        cityManagementPane.classList.add('city-management-pane');
        this.mainWeatherBlock.append(cityManagementPane);

        // Шапка панели: Кнопка "Назад" и заголовок
        const cityManagementPaneHat = document.createElement('div');
        cityManagementPaneHat.classList.add('city-management-pane-hat');

        const getBackBtn = document.createElement('button');
        getBackBtn.classList.add('get-back-btn');
        getBackBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i>'
        cityManagementPaneHat.append(getBackBtn);

        const cityManagementPaneTitle = document.createElement('p');
        cityManagementPaneTitle.textContent = 'Управление городами';
        cityManagementPaneHat.append(cityManagementPaneTitle);

        cityManagementPane.append(cityManagementPaneHat);

        // Форма-контейнер 
        this.citySearchForm.classList.add('city-search-form');
        cityManagementPane.append(this.citySearchForm);
        
        // Поле ввода для поиска/добавления городов
        this.citySearchInput.classList.add('city-search-input');
        // Определить фоновое изображение и текст поля ввода
        /*this.defineBackgroundImage(this.citySearchInput, this.currentCity);*/
        this.citySearchInput.placeholder = 'Введите местоположение';
        // Добавить иконку-лупу
        this.citySearchForm.innerHTML ='<i class="fa-solid fa-magnifying-glass"></i>';
        this.citySearchForm.append(this.citySearchInput);

        // Список добавленных городов
        this.listOfAddedCities.classList.add('list-of-added-cities');
        cityManagementPane.append(this.listOfAddedCities);
        // Наполнить список городами
        this.renderCityList();
    }

    async getCityCoords() {
        if(this.isSearchCancelled) return;

        let chosenCity = this.citySearchInput.value;
        if(!chosenCity) {
            return;
        }
        if(this.cityWeatherData[chosenCity]){
            alert("Город уже добавлен");
            return;
        }

        try {
            let response = await fetch(`https://nominatim.openstreetmap.org/search?q=${chosenCity}&format=json`);
    
            this.citySearchResult = await response.json();
            
            // Отфильтровать результаты
            this.citySearchResult = this.citySearchResult.filter(item => {
                return item.addresstype !== "aeroway" &&
                    item.addresstype !== "state" &&
                    item.addresstype !== "railway";
            })
            console.log(this.citySearchResult);

            this.renderSearchResults(this.citySearchResult);    

        } catch(error) {
            alert("Йой, ошибка при запросе координат");
            console.log(error);
        }
    }

    renderSearchResults(citySearchResult) {
        if(this.isSearchCancelled) return;
        // Панель результатов поиска 
        let searchResultsPane;
        if(!this.mainWeatherBlock.querySelector('.search-results-pane')) {
            // Если панели нет - создаем
        searchResultsPane = document.createElement('div'); 
        } else {
            // Иначе - получаем по классу
            searchResultsPane = this.mainWeatherBlock.querySelector('.search-results-pane');
        }
        searchResultsPane.innerHTML = "";
        searchResultsPane.classList.add('search-results-pane');
        // Подсказка
        let tooltip = document.createElement('p');
        tooltip.textContent = `Если полученных результатов недостаточно,
            уточните ваш запрос`;
        // Рендер
        searchResultsPane.append(tooltip);
        this.mainWeatherBlock.querySelector('.city-management-pane').append(searchResultsPane);
        // Наполнить панель результатами и добавить индекс к результату
        for(let i = 0; i < citySearchResult.length; i++) {
            let searchResultElem = document.createElement('p');
            searchResultElem.setAttribute('data-search-index', [i]);
            searchResultElem.classList.add('search-results-elem');
            searchResultElem.textContent = citySearchResult[i].display_name;
            searchResultsPane.append(searchResultElem);
        }
    }

    async addToListOfCitiesAndProcess(citySearchResult, index) {
        // Добавить город в список и обработать
            this.cityWeatherData[citySearchResult[index].name] = {longitude: citySearchResult[index].lon, latitude: citySearchResult[index].lat};
            this.currentCity = citySearchResult[index].name;
            this.sortCities();
            let weatherData = await this.fetchWeather();
            this.updateWeatherData(weatherData);
    }

    async fetchWeather(cityName) {

    let params = {
                latitude: this.cityWeatherData[cityName || this.currentCity].latitude,
                longitude : this.cityWeatherData[cityName || this.currentCity].longitude,
                timezone: "auto",
                current: "temperature_2m,wind_speed_10m,rain,snowfall,weather_code,relative_humidity_2m,is_day,precipitation,wind_direction_10m",
                wind_speed_unit: "ms",
                forecast_days: "7",
                daily: "sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant",
                hourly: "temperature_2m,precipitation_probability,weather_code",
            };
        

        const url = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams( params ).toString()}`;

        try {    
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Ошибка сервера ${response.status}`);
            }
    
            const weatherData = await response.json();

            // Записать данные
            this.cityWeatherData[cityName || this.currentCity] = weatherData;

            if(cityName) {
                this.renderCityList();
                return; 
            }
            console.log(weatherData);
            return weatherData;
        } catch(error) {
            alert("Ошибка при запросе погодных данных");
            console.log(error);
        }
    }

    convertWindAzimuth(data, isShortMode) {
        switch (true) {
            case (data === 0 || data === 360):
                return isShortMode ? "C" : "Северный";
            case (data > 0 && data < 90):
                return isShortMode ? "C-B" : "Северо-восточный";
            case (data === 90): 
                return isShortMode ? "B" : "Восточный";
            case (data > 90 && data < 180):
                return isShortMode ? "Ю-В" : "Юго-восточный";
            case (data === 180):
                return isShortMode ? "Ю" : "Южный";
            case (data > 180 && data < 270):
                return isShortMode ? "Ю-З" : "Юго-западный";
            case (data === 270):
                return isShortMode ? "З" : "Западный";
            case (data > 270 && data < 360):
                return isShortMode ? "С-З" : "Северо-западный";
        };
    }

    getWeatherKey(cityNameForWeatherKey) {
    // Получаем записанные данные по ключу, где ключ - город из переданного аргумента или текущий город
        let weatherData = this.cityWeatherData[cityNameForWeatherKey] || this.cityWeatherData[this.currentCity];

        // Вычисляем ключ:
        // 1. Время суток
        let timeOfDay = weatherData.current.is_day > 0 ? 'day' : 'night';
        // 2. Вид осадков
        let precipitationType;
        if (weatherData.current.weather_code === 0) {
            precipitationType = "clear";
        } else if (weatherData.current.weather_code > 0 && weatherData.current.weather_code <= 48) {
            precipitationType = "cloud";
        } else if ( (weatherData.current.weather_code >= 51 && weatherData.current.weather_code <= 67) ||
        (weatherData.current.weather_code >= 80 && weatherData.current.weather_code <= 99) ) {
            precipitationType = "rain";
        } else if (weatherData.current.weather_code >= 71 && weatherData.current.weather_code <= 77) {
            precipitationType = "snow";
        }

        return `${precipitationType}_${timeOfDay}`;
    }

    async updateCitiesListWeatherData() {
        for (let key in this.cityWeatherData) {
            this.fetchWeather(key);
        }
    }

    async updateWeatherData(weatherData) {
        // Берем данные из аргумента или из памяти?
        let data;
        weatherData ? data = weatherData : data = this.cityWeatherData[this.currentCity];

        // Обновляем температурный блок:
        // Расчет фонового изображения
        this.defineBackgroundImage(this.mainWeatherBlock, this.currentCity);
        // Температура
        this.mainWeatherBlock.querySelector('[data-main-temperature-field]').firstChild.textContent = data.current.temperature_2m + ' ';
        this.mainWeatherBlock.querySelector('[data-main-temperature-unit-field]').textContent = data.current_units.temperature_2m;
        // Погода
        this.mainWeatherBlock.querySelector('[data-main-precipitation-type-field]')
        .textContent = this.weatherCodeInterpreter(data.current.weather_code);
        // Ветер
        this.mainWeatherBlock.querySelector('[data-main-wind-field]').innerHTML = `<p data-main-wind-field>
            Ветер: ${data.current.wind_speed_10m} М/с<br>
            ${this.convertWindAzimuth(data.current.wind_direction_10m)}
        </p>`
        //Влажность
        this.mainWeatherBlock.querySelector('[data-main-relative-humidity-field]').innerHTML = `Влажность ${data.current.relative_humidity_2m}%`;
        // Закат/рассвет
        let [sunriseTime, sunsetTime] = this.processingSunriseSunsetTime(data);
        if(sunriseTime === sunsetTime) {
        if(data.current.is_day === 0) {
        this.mainWeatherBlock.querySelector('[data-main-sunrise-sunset-time-field]').innerHTML = '<p>Полярная ночь</p>';
        } else {
            this.mainWeatherBlock.querySelector('[data-main-sunrise-sunset-time-field]').innerHTML = '<p>Полярный день</p>';
        }
    } else {
        this.mainWeatherBlock.querySelector('[data-main-sunrise-sunset-time-field]').innerHTML =  `
        <p data-main-sunrise-sunset-time-field>
            Рассвет ${sunriseTime}<br>
            Закат ${sunsetTime}
        </p>`;
    }

        // Обновляем блок с городом:
        // Название города
        this.mainWeatherBlock.querySelector('[data-main-city-title-field]').textContent = this.currentCity;
        // День недели
        this.mainWeatherBlock.querySelector('[data-week-day-field]').textContent = this.defineWeekDay(data);
        // Дата
        this.mainWeatherBlock.querySelector('[data-date-field]').textContent = this.dateFormatting(data.daily.time[0]);
        // Часы
        this.timezone = data.timezone;

        // Подневный прогноз
        for(let i = 0; i < data.daily.time.length; i++) {
            // Строка с датой
            this.mainWeatherBlock.querySelector(`[data-daily-date-field="${i}"]`).innerHTML = `${this.dateFormatting(data.daily.time[i], true)} ${this.defineWeekDay(data, true, i)}`;
            if(i === 0) {
                this.mainWeatherBlock.querySelector(`[data-daily-date-field="${0}"]`).insertAdjacentHTML('beforeend', '<br>Сегодня');
            }
            //Строка с иконками погоды
            this.mainWeatherBlock.querySelector(`[data-daily-precipitation-icon-field="${i}"]`).innerHTML =  this.weatherCodeInterpreter(data.daily.weather_code[i], true);

            // Строка с макс/мин температурой
            this.mainWeatherBlock.querySelector(`[data-daily-temperature-field="${i}"]`).innerHTML = `
                Макс ${data.daily.temperature_2m_max[i]} ${data.daily_units.temperature_2m_max}<br>
                Мин ${data.daily.temperature_2m_min[i]} ${data.daily_units.temperature_2m_min}
            `;
            
            // Строка с ветром
            this.mainWeatherBlock.querySelector(`[data-daily-wind-field="${i}"]`).innerHTML = `
                Ветер ${data.daily.wind_speed_10m_max[i]}М/с,<br>
                ${this.convertWindAzimuth(data.daily.wind_direction_10m_dominant[i], true)}
            `;
        }

        // Почасовой прогноз
        let currentHour = new Date(data.current.time).getHours();
        
        const [sunriseHour, sunsetHour] = this.processingSunriseSunsetTime(data, true);
        for(let i = 0; i < 24; i++) {
            // Строка со временем и датой
            let forecastHour = new Date(data.hourly.time[currentHour + i]).getHours();
            let currentDate = data.hourly.time[i];
            this.mainWeatherBlock.querySelector(`[data-hourly-time-field="${i}"]`).innerHTML = `${this.dateFormatting(currentDate, true)} ${this.defineWeekDay(data, true, currentHour + i, true)}<br>${this.getForecastHourLabel(data.hourly.time[forecastHour])}`;
            if ( i == 0) {
                this.mainWeatherBlock.querySelector(`[data-hourly-time-field="${i}"]`).insertAdjacentHTML('beforeend', '<br>Сейчас');
            }

            // Строка с температурой
            this.mainWeatherBlock.querySelector(`[data-hourly-temperature-field="${i}"]`).textContent = data.hourly.temperature_2m[currentHour + i] + data.hourly_units.temperature_2m;

            // Иконка с описанием погоды
            let precipitation = this.mainWeatherBlock.querySelector(`[data-hourly-precipitation-icon-field="${i}"]`);
            // Отрисовать иконку соответственно времени суток
            if (forecastHour === sunriseHour && sunriseHour !== sunsetHour) {
                // Сейчас рассвет
                precipitation.innerHTML = '<i class="wi wi-sunrise"></i>';
            } else if(forecastHour === sunsetHour && sunriseHour !== sunsetHour) {
                // Сейчас закат
                precipitation.innerHTML = '<i class="wi wi-sunset"></i>';
            } else if (forecastHour < sunriseHour || forecastHour > sunsetHour && sunriseHour !== sunsetHour) {
                // Сейчас ночь
                precipitation.innerHTML = this.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true, true);
            } else if (sunsetHour === sunsetHour && data.current.is_day === 1){
                // Полярный день
                precipitation.innerHTML = this.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true);
            } else if (forecastHour < sunriseHour || forecastHour > sunsetHour && sunriseHour === sunsetHour ){
                // Полярная ночь
                precipitation.innerHTML = this.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true, true);
            } else if (forecastHour > sunriseHour || forecastHour < sunsetHour && sunriseHour !== sunsetHour) {
                // Сейчас день
                precipitation.innerHTML = this.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true);
            }
    
        }
    }

    clockRender(container) {

        if (this.clockId) {
            clearInterval(this.clockId);
        }

        const render = async () => {
            let timeZone = this.timezone;
    
            // Возвращает объект-опций для форматирования времени
            let formatter = new Intl.DateTimeFormat(undefined, {
                timeZone: timeZone,
                hour: "2-digit",
                minute: "2-digit",
                second: '2-digit',
            });

           let currentTime = formatter.format(new Date());
           let [hours, minutes, seconds] = currentTime.split(":");
            container.innerHTML = `
                <b>${hours}</b>:<b>${minutes}</b>:<b>${seconds}</b>
            `;

            // Авто-обновление каждые 15 минут
            if ( (Number(minutes) % 15 === 0) && seconds === '00' && JSON.stringify(this.cityWeatherData) !== "{}") {
                let weatherData = await this.fetchWeather();
                this.updateWeatherData(weatherData);
                await this.updateCitiesListWeatherData();
                this.renderCityList();
            }
        }
            render();
            this.clockId = setInterval(() => render(), 1000);
    }

    dateFormatting(data, isShortMode){
        if (isShortMode) {
            return data.slice(5,10).split('-').reverse().join('. ');
        }
        return data.split('-').reverse().join('. ');
    }

    getEuroDay(date) {
        let day = date.getDay();
        return day === 0 ? day = 7 : day; 
    }

    weatherCodeInterpreter(data, isIconMode, isNight) {
        // Для режима возвращающего иконки
        if(isIconMode) {
                if(data === 0 ){
                    if(isNight){
                        return `<i class="wi wi-night-clear"></i>`;
                    } else {
                        return `<i class="wi wi-day-sunny"></i>`;
                    }
                } else if(data >=1 && data <=2) {
                    if(isNight){
                        return `<i class="wi wi-night-alt-cloudy"></i>`;
                    } else {
                        return `<i class="wi wi-day-cloudy"></i>`; 
                    }
                } else if(data === 3) {
                    return `<i class="wi wi-cloudy"></i>`;
                } else if(data === 45) {
                    return `<i class="wi wi-fog"></i>`;
                } else if( data >= 46 && data <= 67) {
                    return `<i class="wi wi-showers"></i>`;
                } else if( data >= 71 && data <= 77) {
                    return `<i class="wi wi-snow"></i>`;
                } else if(data >= 80 && data <= 82){
                    return `<i class="wi wi-rain"></i>`
                } else if(data >= 82 && data <= 86) {
                    return `<i class="wi wi-sleet"></i>`;
                } else if(data >= 95 && data <= 99) {
                    return `<i class="wi wi-thunderstorm"></i>`;
                }
                return;
        }

        switch (data) {
            case 0 : return "Ясно";
            case 1 : return "Преимущ. ясно";
            case 2 : return "Переменная облачность";
            case 3 : return "Пасмурно";
            case 45 : return "Туман";
            case 48 : return "Оседающая изморозь";
            case 51 : return "Слабая морось";
            case 53 : return "Морось";
            case 55 : return "Интенсивная морось";
            case 56 : return "Замерзающая морось";
            case 57 : return "Плотная замерзающая морось";
            case 61 : return "Слабый дождь";
            case 63 : return "Дождь";
            case 65 : return "Сильный дождь";
            case 66 : return "Замерзающий дождь";
            case 67 : return "Сильный замерзающий дождь";
            case 71 : return "Слабый снегопад";
            case 73 : return "Снегопад";
            case 75 : return "Сильный снегопад";
            case 77 : return "Крупный снег";
            case 80 : return "Слабый ливень";
            case 81 : return "Ливень";
            case 82 : return "Сильный ливень";
            case 85 : return "Снег с дождем";
            case 86 : return "Сильный снег с дождем";
            case 95 : return "Гроза";
            case 96 : return "Гроза с градом";
            case 99 : return "Гроза с крупным градом";
        }
    }

    roundToNearestHour(data) {
    // Округлить до ближайшего часа для расчета времени восхода/заката
        let date = new Date(data);
        if(date.getMinutes() >= 30) {
            date.setHours(date.getHours() + 1);
        } else {
            date.setMinutes(0, 0, 0)
        } 
        return date;
    }

    processingSunriseSunsetTime(data, isRoundToNearest) {
        let sunriseTime;
        let sunsetTime;

        // Если нужно округлить до ближайшего часа (для расчета иконок в почасовом прогнозе)
        if(isRoundToNearest) {
            sunriseTime = this.roundToNearestHour(data.daily.sunrise[0]);

            sunsetTime = this.roundToNearestHour(data.daily.sunset[0]);

            return [sunriseTime.getHours(), sunsetTime.getHours()];
        }
        
        // Объект с опциями для форматирования
        let formatter =  new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        });
        // Время восхода
        sunriseTime = formatter.format(new Date(data.daily.sunrise[0]));
        // Избавляемся от ведущего нуля
        if(sunriseTime[0] === "0" && sunriseTime[1] !== "0") {
            sunriseTime = sunriseTime.slice(1)
        }
        // Время заката
        sunsetTime = formatter.format(new Date(data.daily.sunset[0]));
        // Избавляемся от ведущего нуля
        if(sunsetTime[0] === "0" && sunsetTime[1] !== "0") {
            sunsetTime = sunsetTime.slice(1)
        }
        return [sunriseTime, sunsetTime];
    }

    renderTemperatureBlock(container) {

        let temperatureBlock = document.createElement('div');   
        temperatureBlock.classList.add('temperature-block');
        temperatureBlock.innerHTML = `
            <b data-main-temperature-field>
                <span data-main-temperature-unit-field></span>
            </b>
            <p data-main-precipitation-type-field></p>
            <p data-main-wind-field></p>
            <p data-main-relative-humidity-field></p>
            <p data-main-sunrise-sunset-time-field></p>`;

        // Отрисовать блок с данными в контейнере
        container.append(temperatureBlock);
    }

    defineWeekDay(data, isShortMode, counter, isHourly) {
        if(isShortMode) {
            const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
            const currentDayOfWeek = daysOfWeek[this.getEuroDay(new Date(isHourly ? data.hourly.time[counter] : data.daily.time[counter])) - 1];
            return currentDayOfWeek;
        }

        const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
        const currentDayOfWeek = daysOfWeek[this.getEuroDay(new Date(data.current.time)) - 1];
        return currentDayOfWeek;

    }

    renderCItyBlock(container) {

        // Элемент с названием города
        let cityBlock = document.createElement('div');
        const mainCityTitle = document.createElement('h2');
        mainCityTitle.setAttribute('data-main-city-title-field', '');
        cityBlock.append(mainCityTitle);

        // Строка с днем недели
        let weekDayElem = document.createElement('span');
        weekDayElem.setAttribute('data-week-day-field', '');
        cityBlock.append(weekDayElem);

        // Элемент с сегодняшней датой 
        let dateElem = document.createElement('span');
        dateElem.setAttribute('data-date-field', '');
        cityBlock.append(dateElem);

        // Элемент с часами
        let clockContainer = document.createElement('span');
        clockContainer.setAttribute('data-clock-container', '');
        cityBlock.classList.add('city-block');
        cityBlock.append(clockContainer);

        // Кнопка добавить город в список
        let addBtn = document.createElement('button');
        addBtn.setAttribute('type', 'button');
        addBtn.setAttribute('data-action', 'add-city')
        addBtn.textContent = "Управление городами";
        addBtn.classList.add('btn');
        cityBlock.append(addBtn);

        // Отрисовка блока
        container.append(cityBlock);
    }

    renderCityList() {
        // Создать открывающийся список городов
        this.listOfAddedCities.innerHTML = "";
        // Наполняем список городов из объекта с данными
        Object.keys(this.cityWeatherData).forEach(key => {
            let listElem = document.createElement('div');
            listElem.classList.add('list-elem');
            const cityInfoElement = document.createElement('div');
            const temperatureElem = document.createElement('span');

            temperatureElem.innerHTML = `${this.cityWeatherData[key].current.temperature_2m}${this.cityWeatherData[key].current_units.temperature_2m}`;

            let cityTitle = document.createElement('h2');
            listElem.append(cityInfoElement);
            cityInfoElement.append(cityTitle);
            cityInfoElement.append(temperatureElem);

            // Кнопка удаления
            let deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            cityTitle.textContent = key;
            deleteBtn.innerHTML = `<i class="fa-regular fa-trash-can"></i>`;
            listElem.append(deleteBtn);

            this.defineBackgroundImage(listElem, key);

            this.listOfAddedCities.append(listElem);
        });
    }
    
    renderDailyForecast(container) {
        // Блок с карточками прогнозов
        let forecastBlock = document.createElement('div');
        forecastBlock.classList.add('daily-forecast-block');

        // Создать и наполнить данными карточки
        for(let i = 0; i < 7; i++) {   
            let forecastElem = document.createElement('div');
            forecastElem.classList.add('daily-forecast-elem');
            forecastElem.style.minWidth = Math.round(container.offsetWidth / 3) - 4 + 'px';
            
            // Строка с датой
            let dateElem = document.createElement('span');
            dateElem.setAttribute('data-daily-date-field', i);
            forecastElem.append(dateElem);

            // Строка с иконками погоды
            let precipitationType = document.createElement('div');
            precipitationType.setAttribute('data-daily-precipitation-icon-field', i);
            forecastElem.append(precipitationType);

            // Строка с макс/мин температурой
            let tempElem = document.createElement('p');
            tempElem.setAttribute('data-daily-temperature-field', i);
            forecastElem.append(tempElem);

            // Строка с ветром
            let windElem = document.createElement('p');
            windElem.setAttribute('data-daily-wind-field', i);
            forecastElem.append(windElem);

            // Отрисовать карточку дня в контейнере
            forecastBlock.append(forecastElem)
        }
        container.append(forecastBlock);
    }

    getForecastHourLabel(data) {
        // Отформатировать время для часового прогноза
        let timeZone = data.timezone;
        
        // Возвращает объект-опций для форматирования времени
        let formatter = new Intl.DateTimeFormat(undefined, {
            timeZone: timeZone,
            hour: "2-digit",
            minute: "2-digit",
        });
        let currentTime = new Date (new Date(data).setMinutes(0));

        return formatter.format(currentTime);
    }

    renderHourlyForecast(container) {
        // Блок с карточками прогнозов
        let forecastBlock = document.createElement('div');
        forecastBlock.classList.add('hourly-forecast-block');
        forecastBlock.classList.add('hidden');


        // Создать и наполнить данными почасовые карточки
        for(let i = 0; i < 24; i++) {
            let forecastElem = document.createElement('div');
            forecastElem.classList.add('hourly-forecast-elem');
            forecastElem.style.minWidth = Math.round(container.offsetWidth / 4) - 4 + 'px';

            // Строка со временем и датой
            let timeElem = document.createElement('span');
            timeElem.setAttribute('data-hourly-time-field', i);
            forecastElem.append(timeElem);

            // Строка с температурой
            let tempElem = document.createElement('span');
            tempElem.setAttribute('data-hourly-temperature-field', i);
            forecastElem.append(tempElem);

            // Иконка с описанием погоды
            let precipitation = document.createElement('div');
            precipitation.setAttribute('data-hourly-precipitation-icon-field', i);

            forecastElem.append(precipitation);

            forecastBlock.append(forecastElem);
        }

        container.append(forecastBlock);
    }

    renderForecastToggler(container) {
        const toggler = document.createElement('div');
        toggler.classList.add('toggler');
        container.append(toggler);
        
        // Кнопки "Часовой" и "Недельный" Прогноз
        // Прогноз по дням
        const dailyBtn = document.createElement('button');
        dailyBtn.classList.add('activated-forecast-button')
        dailyBtn.setAttribute('type', 'button');
        dailyBtn.setAttribute('data-forecast-toggler', 'daily-forecast');
        dailyBtn.textContent = "На неделю";
        dailyBtn.classList.add('btn');
        toggler.append(dailyBtn);

        // Прогноз по часам
        const hourlyBtn = document.createElement('button');
        hourlyBtn.classList.add('deactivated-forecast-button')
        hourlyBtn.setAttribute('type', 'button');
        hourlyBtn.setAttribute('data-forecast-toggler', 'hourly-forecast');
        hourlyBtn.textContent = "По часам";
        hourlyBtn.classList.add('btn');
        toggler.append(hourlyBtn);

    }

    defineBackgroundImage(target, cityName){
        // Определить фоновое изображение для target
        const backgroundUrls = { 
            'clear_day': './img/clear_day.png',
            'rain_day': './img/rain_day.png',
            'snow_day': './img/snow_day.png',
            'cloud_day': './img/cloud_day.png',
            'clear_night': './img/clear_night.png',
            'rain_night': './img/rain_night.png',
            'snow_night': './img/snow_night.png',
            'cloud_night': './img/cloud_night.png'
        };

        let currentWeatherKey = this.getWeatherKey(cityName);

        let backgroundImageUrl = backgroundUrls[currentWeatherKey];
        target.style.backgroundImage = `url('${backgroundImageUrl}')`;
    }

    renderMainWeatherBlock() {
        // Общий блок
        this.mainWeatherBlock.innerHTML = "";
        this.mainWeatherBlock.classList.add('main-wether-block');
        const mainWeatherBlockTop = document.createElement('div');
        mainWeatherBlockTop.classList.add('main-weather-block-top');

        // Отрисовка всего:
        // Основной блок
        this.container.prepend(this.mainWeatherBlock);

        // Верх:
        this.mainWeatherBlock.prepend(mainWeatherBlockTop);
        // Блок с температурой и ветром
        this.renderTemperatureBlock(mainWeatherBlockTop);
        // Блок с городом, датой, часами и кнопкой 
        this.renderCItyBlock(mainWeatherBlockTop);

        // Низ:
        const mainWeatherBlockBottom = document.createElement('div');
        mainWeatherBlockBottom.classList.add('main-weather-block-bottom');
        this.mainWeatherBlock.append(mainWeatherBlockBottom);
        // Переключатель прогноза часовой\недельный
        this.renderForecastToggler(mainWeatherBlockBottom);
        // Недельный прогноз
        this.renderDailyForecast(mainWeatherBlockBottom);
        // Почасовой прогноз
        this.renderHourlyForecast(mainWeatherBlockBottom)
    }

    initEventHandlers() {
        this.container.addEventListener('click', this.eventClickHandlers);

        this.citySearchForm.addEventListener('submit', this.formSubmitHandler);

        this.citySearchInput.addEventListener('focusin', this.inputFocusHandler);

        this.citySearchInput.addEventListener('input', this.inputAutocompleteHandler)

    }

    formSubmitHandler(event) {
        event.preventDefault();
        if(event.target.elements[0].value) {
            this.getCityCoords();
            event.target.value = '';
        }
    }

    inputAutocompleteHandler() {
        clearTimeout(this.autocompleteTimer);
        this.isSearchCancelled = false;
        this.autocompleteTimer = setTimeout(() => {
            if(this.isSearchCancelled) return
            const query = this.citySearchInput.value;
            if (query) {
                this.getCityCoords(query);
            }
        }, 500)
    }

    inputFocusHandler() {

        this.mainWeatherBlock.querySelector('.list-of-added-cities').style.display = 'none';

        this.citySearchForm.firstElementChild.classList.add('fa-shake');

        if(!this.mainWeatherBlock.querySelector('.cancel-search-Btn')) {
        // Если нет кнопки отмена - создаем
            const cancelSearchBtn = document.createElement('button');
            cancelSearchBtn.classList.add('cancel-search-Btn');
            cancelSearchBtn.setAttribute('type', 'button');
            cancelSearchBtn.textContent = 'Отмена';
            this.citySearchForm.append(cancelSearchBtn);
            }

    }

    inputBlurHandler() {
        clearTimeout(this.autocompleteTimer);
        this.isSearchCancelled = true;
        this.autocompleteTimer = null;
        this.citySearchForm.firstElementChild.classList.remove('fa-shake');
        
    }

    cancelSearch() {
        /* Метод для выхода из режима поиска для кнопок 
        "Выйти из панели управления городами", "Отменить поиск" или
        если выбран результат поиска */

        // Очищаем debounce и ставим флаг для отмены поиска на случай если был текст в поле ввода
        this.isSearchCancelled = true;
        clearTimeout(this.autocompleteTimer);

        // Возвращаем отображаем список городов
        this.mainWeatherBlock.querySelector('.list-of-added-cities').style.display = 'flex';
        // Сбрасываем и расфокусируем форму
        this.citySearchForm.elements[0].value = '';
        this.citySearchForm.elements[0].blur();

        if(this.mainWeatherBlock.querySelector('.cancel-search-Btn')){
        // Убираем кнопку "отменить поиск"
        document.querySelector('.cancel-search-Btn').remove();
        }
        const searchResultsPane = document.querySelector('.search-results-pane');
        if(searchResultsPane) {
            // Убираем панель результатов поиска если она есть
            searchResultsPane.remove();
        }
    }

    eventClickHandlers(event) {  
        // Отобразить/скрыть список городов, удалить/добавить город и тд
        const deleteBtnClick = event.target.closest('.delete-btn');
        const clickOnCityTitle = event.target.closest('.list-elem > div');
        const addBtnClick = event.target.closest('[data-action]');
        const clickOnSearchResult = event.target.dataset.searchIndex;
        const clickOnGetBackBtn = event.target.closest('.get-back-btn');
        const clickOnForecastToggler = event.target.closest('[data-forecast-toggler]');
        const clickOnSearchCancelBtn = event.target.closest('.cancel-search-Btn');

        //Если клик по кнопке удаления
        if (deleteBtnClick) {
            const targetListElem = event.target.closest('.list-elem');
            const targetListElemTitle = targetListElem.children[0].firstElementChild.textContent;
            // Если добавленный в список город всего 1 - не удалять
            if (this.listOfAddedCities.children.length === 1) {
                deleteBtnClick.firstElementChild.classList.add('fa-shake')
                setTimeout(() => {
                    deleteBtnClick.firstElementChild.classList.remove('fa-shake')
                }, 250);
                return;
            }
            // Если удаляем текущий город - запросить данные на следующий
            if (targetListElemTitle === this.currentCity) {    
                deleteBtnClick.firstElementChild.classList.add('fa-bounce');
                setTimeout(() => {
                    deleteBtnClick.firstElementChild.classList.remove('fa-bounce');
                    delete this.cityWeatherData[targetListElemTitle];
                    delete this.cityWeatherData[targetListElemTitle];
                    targetListElem.remove();
                    this.currentCity = this.listOfAddedCities.firstElementChild.firstElementChild.firstElementChild.textContent;
                    this.updateWeatherData();
                }, 400);
               
            } else {
                deleteBtnClick.firstElementChild.classList.add('fa-bounce');
                setTimeout(() => {
                    deleteBtnClick.firstElementChild.classList.remove('fa-bounce');
                    delete this.cityWeatherData[targetListElemTitle];
                    delete this.cityWeatherData[targetListElemTitle];
                    targetListElem.remove();
                }, 400);
            }
        }

        // Ну тут все очевидно надеюсь:)
        if(addBtnClick) {
            setTimeout( () => {
                this.renderCityManagementPane();
                this.citySearchInput.addEventListener('blur', this.inputBlurHandler);
            }, 250);
        }

        /*Если клик на город из списка - 
        выбираем город для отображения погоды*/
        if(clickOnCityTitle) {
            
            this.currentCity = clickOnCityTitle.querySelector('h2').textContent;
            this.mainWeatherBlock.querySelector('.city-management-pane').remove();
            this.updateWeatherData();

        };

        // Выбрать подходящий результат поиска
        if(clickOnSearchResult) {
            setTimeout(() => {

                const searchResultIndex = event.target.dataset.searchIndex;
                this.addToListOfCitiesAndProcess(this.citySearchResult, searchResultIndex);
                this.cancelSearch();
                
                this.mainWeatherBlock.querySelector('.city-management-pane').remove();
            }, 250);

        }

        // Если клик на кнопку назад
        if(clickOnGetBackBtn) {
            setTimeout(() => {
                this.cancelSearch()
                this.mainWeatherBlock.querySelector('.city-management-pane').remove();
            }, 250);
        }

        // Если клик на переключатель часового\недельного прогноза
        if(clickOnForecastToggler){

            const hourlyForecast = this.container.querySelector('.hourly-forecast-block');
            const dailyForecast = this.container.querySelector('.daily-forecast-block');

            const hourlyBtn = event.target.closest('.toggler').children[1];
            const dailyBtn = event.target.closest('.toggler').children[0];

            if(event.target.dataset.forecastToggler == 'daily-forecast') {

                dailyBtn.classList.add('activated-forecast-button');
                dailyBtn.classList.remove('deactivated-forecast-button');

                hourlyBtn.classList.add('deactivated-forecast-button');
                hourlyBtn.classList.remove('activated-forecast-button');

                dailyForecast.classList.remove('hidden');
                hourlyForecast.classList.add('hidden');
            } else if(event.target.dataset.forecastToggler == 'hourly-forecast') {
                
                dailyBtn.classList.remove('activated-forecast-button');
                dailyBtn.classList.add('deactivated-forecast-button');

                hourlyBtn.classList.remove('deactivated-forecast-button');
                hourlyBtn.classList.add('activated-forecast-button');

                dailyForecast.classList.add('hidden');
                hourlyForecast.classList.remove('hidden');
            }
        }

        // Если клик на кнопку "отменить поиск"
        if(clickOnSearchCancelBtn) {
            setTimeout(() => {
                this.cancelSearch();
            }, 150);
        }
    }
}

let weatherWidget = new WeatherWidget(document.querySelector('.container'));
