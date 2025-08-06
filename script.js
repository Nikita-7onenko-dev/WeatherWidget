
class WeatherWidget {
    constructor(container) {
        // Главный контейнер
        this.container = container;
        // Главная панель погоды
        this.mainWeatherBlock = document.createElement('div');
        // Текущий город, выбранный в главной панели, для получения погодных данных
        this.currentCity = "";
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
        // Привязываем контекст к обработчикам событий:
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
        // Инициализируем обработчики
        this.initEventHandlers();
        // Инициализируем часы 
        this.clockRender(this.forecastElements.current.clockContainer);
       // Если есть данные в localStorage
        if(localStorage.length > 0) {
            // Устанавливаем выбранный город из localStorage
            this.currentCity = localStorage.getItem('currentCity');
            // Берем координаты текущего города для обновления главного экрана
            this.cityWeatherData[this.currentCity] = JSON.parse(localStorage.getItem(this.currentCity));
            // Делаем запрос по текущему городу
            await this.fetchWeather();
            // Берем данные из localStorage
            this.getCitiesFromLocalStorage();
            // Обновляем данные всех городов из списка (кроме текущего this.currentCity)
            this.updateCitiesListWeatherData(false);
        } else {
            // Получаем координаты по ip
            await this.fetchLocationByIP();
            // И делаем запрос погодных данных
            await this.fetchWeather();
        }
        // Наполняем разметку на главном экране
        this.updateWeatherData()


    }

    getCitiesFromLocalStorage() {
    
        // Наполняем данными хранилище в экземпляре
        for(let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if(key === "currentCity" || key === this.currentCity) continue;
            let json = localStorage.getItem(key);
            this.cityWeatherData[key] = JSON.parse(json)
        }
        // Сортируем список городов
        this.cityWeatherData = WeatherWidget.sortCities(this.cityWeatherData)
    }

    cityWeatherData = {
    }

    forecastElements = {
    // Ссылки на разметку для обновления данных
        current: {},
        daily: {
            dateField: [],
            precipitationField: [],
            temperatureField: [],
            windField: [],
        },
        hourly: {
            timeField: [],
            temperatureField: [],
            precipitationField: [],
        },
    }

    static sortCities(target) {
        // Сортировать города в алфавитном порядке, для отрисовки списка
        return Object.fromEntries(
                Object.entries(target)
                    .sort( ([keyA], [keyB]) => keyA.localeCompare(keyB) )
        );
    }

    async fetchLocationByIP() {
    try{
        let response = await fetch('https://tiny-waterfall-4e64.nikitatrihomkin.workers.dev/');
        if(!response.ok) throw new Error(`Ошибка сервера при запросе местоположения по IP - ${response.status}`)
        
        let location = await response.json();

        this.currentCity = location.city;

        this.cityWeatherData[location.city] = {
            latitude: location.latitude,
            longitude: location.longitude
        };
    
    } catch(err) {
        console.log(err)
        console.log(err.message)
    }
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
        const getBackIcon = document.createElement('i');
        getBackIcon.classList.add('fa-solid', 'fa-arrow-left')
        getBackBtn.append(getBackIcon);
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

        let chosenCity = this.citySearchInput.value.trim();
        if(!chosenCity) {
            return;
        }
        if(this.cityWeatherData[chosenCity]){
            alert("Город уже добавлен");
            return;
        }

        try {
            let response = await fetch(`https://for-native-js-w-w-openstreetmap-nominatim.nikitatrihomkin.workers.dev/?q=${chosenCity}`);
    
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
        tooltip.textContent = `Если полученных результатов недостаточно, уточните ваш запрос`;
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
        const cityName = citySearchResult[index].name;
        this.cityWeatherData[cityName] = {longitude: citySearchResult[index].lon, latitude: citySearchResult[index].lat};
        // Сохранить в localStorage
        localStorage.setItem('currentCity', cityName)
        localStorage.setItem( cityName, JSON.stringify({ 
            latitude: this.cityWeatherData[cityName].latitude,
            longitude: this.cityWeatherData[cityName].longitude
        }) );
        // Сделать выбранный город - текущим(отображаемым на главной панели)
        this.currentCity = cityName;
        // Отсортировать список
        this.cityWeatherData = WeatherWidget.sortCities(this.cityWeatherData);
        // Запрашиваем погодные данные по выбранному городу
        await this.fetchWeather();
        // Обновляем поля с данными на главном экране
        this.updateWeatherData();
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

            console.log(weatherData);

            // return weatherData;
        } catch(error) {
            alert("Ошибка при запросе погодных данных");
            console.log(error);
        }
    }

    static convertWindAzimuth(data, isShortMode) {
        // Проверяем диапазон, если данные равны 0 или 360... и тд
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
        // 1. Вид осадков
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
        // 2. Время суток
        let timeOfDay = weatherData.current.is_day > 0 ? 'day' : 'night';

        return `${precipitationType}_${timeOfDay}`;
    }

    async updateCitiesListWeatherData(isIncludeCurrent) {
        // Обновляем данные всех городов из списка
        let cityKeys = Object.keys(this.cityWeatherData);
        cityKeys = isIncludeCurrent ? cityKeys : cityKeys.filter(cityName => cityName !== this.currentCity);
        await Promise.all( cityKeys.map( cityName => this.fetchWeather(cityName) ) );
        // Как только обновили все - перерисовываем список
        this.renderCityList();
        // Если текущий город включен
        if(isIncludeCurrent) {
            // Обновляем главный экран
            this.updateWeatherData();
        }
    }

    updateWeatherData() {
        let data = this.cityWeatherData[this.currentCity];

        // Расчет фонового изображения
        this.defineBackgroundImage(this.mainWeatherBlock, this.currentCity);
        
        // Обновляем температурный блок:
        // Температура
        this.forecastElements.current.temperatureField.textContent = data.current.temperature_2m + ' ';
        this.forecastElements.current.temperatureUnitField.textContent = data.current_units.temperature_2m;
        // Погода
        this.forecastElements.current.precipitationTypeField.textContent = WeatherWidget.weatherCodeInterpreter(data.current.weather_code);
        // Ветер
        this.forecastElements.current.windField.innerHTML = `
            Ветер: ${data.current.wind_speed_10m} М/с<br>
            ${WeatherWidget.convertWindAzimuth(data.current.wind_direction_10m)}
        `;
        //Влажность
        this.forecastElements.current.humidityField.textContent = `Влажность ${data.current.relative_humidity_2m}%`;
        // Закат/рассвет
        let [sunriseTime, sunsetTime] = WeatherWidget.processingSunriseSunsetTime(data);
        if(sunriseTime === sunsetTime) {
            if(data.current.is_day === 0) {
                this.forecastElements.current.sunriseSunsetField.textContent = 'Полярная ночь';
            } else {
                this.forecastElements.current.sunriseSunsetField.textContent = 'Полярный день';
            }
        } else {
            this.forecastElements.current.sunriseSunsetField.innerHTML =  `
            Рассвет ${sunriseTime}<br>
            Закат ${sunsetTime}`;
        }

        // Обновляем блок с городом:
        // Название города
        this.forecastElements.current.mainCityTitleField.textContent = this.currentCity;
        // День недели
        this.forecastElements.current.weekDayField.textContent = WeatherWidget.defineWeekDay(data);
        // Дата
        this.forecastElements.current.dateField.textContent = WeatherWidget.dateFormatting(data.daily.time[0]);
        // Часы
        this.timezone = data.timezone;

        // Подневный прогноз
        for(let i = 0; i < data.daily.time.length; i++) {
            // Строка с датой
            this.forecastElements.daily.dateField[i].textContent = `${WeatherWidget.dateFormatting(data.daily.time[i], true)} ${WeatherWidget.defineWeekDay(data, true, i)}`;
            if(i === 0) {
                this.forecastElements.daily.dateField[0].insertAdjacentHTML('beforeend', '<br>Сегодня');
            }
            //Строка с иконками погоды
            this.forecastElements.daily.precipitationField[i].innerHTML =  WeatherWidget.weatherCodeInterpreter(data.daily.weather_code[i], true);

            // Строка с макс/мин температурой
            this.forecastElements.daily.temperatureField[i].innerHTML = `
                Макс ${data.daily.temperature_2m_max[i]} ${data.daily_units.temperature_2m_max}<br>
                Мин ${data.daily.temperature_2m_min[i]} ${data.daily_units.temperature_2m_min}
            `;
            
            // Строка с ветром
            this.forecastElements.daily.windField[i].innerHTML = `
                Ветер ${data.daily.wind_speed_10m_max[i]}М/с,<br>
                ${WeatherWidget.convertWindAzimuth(data.daily.wind_direction_10m_dominant[i], true)}
            `;
        }

        // Почасовой прогноз
        let currentHour = new Date(data.current.time).getHours();
        
        const [sunriseHour, sunsetHour] = WeatherWidget.processingSunriseSunsetTime(data, true);
        for(let i = 0; i < 24; i++) {
            // Строка со временем и датой
            let forecastHour = new Date(data.hourly.time[currentHour + i]).getHours();
            let currentDate = data.hourly.time[i + currentHour];

            this.forecastElements.hourly.timeField[i].innerHTML = `${WeatherWidget.dateFormatting(currentDate, true)} ${WeatherWidget.defineWeekDay(data, true, currentHour + i, true)}<br>${WeatherWidget.getForecastHourLabel(data.hourly.time[forecastHour])}`;
            if ( i == 0) {
                this.forecastElements.hourly.timeField[0].insertAdjacentHTML('beforeend', '<br>Сейчас');
            }

            // Строка с температурой
            this.forecastElements.hourly.temperatureField[i].textContent = data.hourly.temperature_2m[currentHour + i] + data.hourly_units.temperature_2m;

            // Иконка с описанием погоды
            let precipitation =  this.forecastElements.hourly.precipitationField[i];

            // Отрисовать иконку соответственно времени суток
            if (forecastHour === sunriseHour && sunriseHour !== sunsetHour) {
                // Сейчас рассвет
                precipitation.innerHTML = '<i class="wi wi-sunrise"></i>';

            } else if(forecastHour === sunsetHour && sunriseHour !== sunsetHour) {
                // Сейчас закат
                precipitation.innerHTML = '<i class="wi wi-sunset"></i>';

            } else if ((forecastHour < sunriseHour || forecastHour > sunsetHour) && sunriseHour !== sunsetHour) {
                // Сейчас ночь
                precipitation.innerHTML = WeatherWidget.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true, true);

            } else if (sunsetHour === sunriseHour && data.current.is_day === 1){
                // Полярный день
                precipitation.innerHTML = WeatherWidget.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true);

            } else if (forecastHour < sunriseHour || forecastHour > sunsetHour && sunriseHour === sunsetHour ){
                // Полярная ночь
                precipitation.innerHTML = WeatherWidget.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true, true);

            } else if ((forecastHour > sunriseHour || forecastHour < sunsetHour) && sunriseHour !== sunsetHour){
                // Сейчас день
                precipitation.innerHTML = WeatherWidget.weatherCodeInterpreter(data.hourly.weather_code[currentHour + i], true);
            }
    
        }
    }

    clockRender(container) {

        if (this.clockId) {
            clearInterval(this.clockId);
        }

        const render = () => {
            // Возвращает объект-опций для форматирования времени
            let formatter = new Intl.DateTimeFormat(undefined, {
                timeZone: this.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                hour: "2-digit",
                minute: "2-digit",
                second: '2-digit',
            });

           let currentTime = formatter.format(new Date());
           let [hours, minutes, seconds] = currentTime.split(":");
            container.innerHTML = `
                <b>${hours}</b>:<b>${minutes}</b>:<b>${seconds}</b>
            `;

            // Авто-обновление каждые 5 минут
            if ( (Number(minutes) % 5 === 0) && seconds === '01') {
                // Обновляем список городов (включая текущий город)
                this.updateCitiesListWeatherData(true);
            }
        }
            render();
            this.clockId = setInterval(() => render(), 1000);
    }

    static dateFormatting(data, isShortMode){
        if (isShortMode) {
            return data.slice(5,10).split('-').reverse().join('. ');
        }
        return data.split('-').reverse().join('. ');
    }

    static getEuroDay(date) {
        let day = date.getDay();
        return day === 0 ? day = 7 : day; 
    }

    static weatherCodeInterpreter(data, isIconMode, isNight) {
        // Для режима возвращающего иконки
        if(isIconMode) {
            const weatherIcons = {
                0: {day: "wi-day-sunny", night: "wi-night-clear",},
                1: {day: "wi-day-cloudy", night: "wi-night-alt-cloudy"},
                2: {day: "wi-day-cloudy", night: "wi-night-alt-cloudy"},
                3: {all: "wi-cloudy"},
                45: {all: "wi-fog"},
                46: {all: "wi-showers"}, 48: {all: "wi-showers"},
                51: {all: "wi-showers"}, 53: {all: "wi-showers"},
                55: {all: "wi-showers"}, 56: {all: "wi-showers"},
                57: {all: "wi-showers"}, 61: {all: "wi-showers"},
                63: {all: "wi-showers"}, 65: {all: "wi-showers"},
                66: {all: "wi-showers"}, 67: {all: "wi-showers"},
                71: {all: "wi-snow"}, 73: {all: "wi-snow"},
                75: {all: "wi-snow"}, 77: {all: "wi-snow"},
                80: {all: "wi-rain"}, 81: {all: "wi-rain"}, 82: {all: "wi-rain"},
                85: {all: "wi-sleet"}, 86: {all: "wi-sleet"},
                95: {all: "wi-thunderstorm"}, 96: {all: "wi-thunderstorm"}, 99:{all: "wi-thunderstorm"},
            }

            const iconClass = weatherIcons[data][isNight ? "night" : "day"] || weatherIcons[data]["all"];
            return iconClass ? `<i class="wi ${iconClass}"></i>` : `<i class="wi-na"></i>`
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

    static roundToNearestHour(data) {
    // Округлить до ближайшего часа для расчета времени восхода/заката
        let date = new Date(data);
        if(date.getMinutes() >= 30) {
            date.setHours(date.getHours() + 1);
        } else {
            date.setMinutes(0, 0, 0)
        } 
        return date;
    }

    static processingSunriseSunsetTime(data, isRoundToNearest) {
        let sunriseTime;
        let sunsetTime;

        // Если нужно округлить до ближайшего часа (для расчета иконок в почасовом прогнозе)
        if(isRoundToNearest) {
            sunriseTime = WeatherWidget.roundToNearestHour(data.daily.sunrise[0]);

            sunsetTime = WeatherWidget.roundToNearestHour(data.daily.sunset[0]);

            return [sunriseTime.getHours(), sunsetTime.getHours()];
        }
        
        // Объект с опциями для форматирования
        let formatter =  new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
        });
        // Время восхода
        sunriseTime = formatter.format(new Date(data.daily.sunrise[0]));
        // Время заката
        sunsetTime = formatter.format(new Date(data.daily.sunset[0]));
        return [sunriseTime, sunsetTime];
    }

    renderTemperatureBlock(container) {

        let temperatureBlock = document.createElement('div');   
        temperatureBlock.classList.add('temperature-block');
        // Создаём элементы
        let temperatureField = document.createElement('b');
        let temperatureValue = document.createTextNode("");
        let tempUnit = document.createElement('span');
        let precipitationType = document.createElement('p');
        let wind = document.createElement('p');
        let humidity = document.createElement('p');
        let sunriseSunset = document.createElement('p');

        // Вставляем элементы
        temperatureField.append(temperatureValue);
        temperatureField.append(tempUnit);
        temperatureBlock.append(temperatureField, precipitationType, wind, humidity, sunriseSunset);
        container.append(temperatureBlock);

        // Записываем ссылки на поля в экземпляр
        this.forecastElements.current.temperatureField = temperatureValue;
        this.forecastElements.current.temperatureUnitField = tempUnit;
        this.forecastElements.current.precipitationTypeField = precipitationType;
        this.forecastElements.current.windField = wind;
        this.forecastElements.current.humidityField = humidity;
        this.forecastElements.current.sunriseSunsetField = sunriseSunset;
    }

    static defineWeekDay(data, isShortMode, counter, isHourly) {
        if(isShortMode) {
            const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
            const currentDayOfWeek = daysOfWeek[WeatherWidget.getEuroDay(new Date(isHourly ? data.hourly.time[counter] : data.daily.time[counter])) - 1];
            return currentDayOfWeek;
        }

        const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
        const currentDayOfWeek = daysOfWeek[WeatherWidget.getEuroDay(new Date(data.current.time)) - 1];
        return currentDayOfWeek;
    }

    renderCItyBlock(container) {

        // Элемент с названием города
        let cityBlock = document.createElement('div');
        const mainCityTitle = document.createElement('h2');
        cityBlock.append(mainCityTitle);
        this.forecastElements.current.mainCityTitleField = mainCityTitle;

        // Строка с днем недели
        let weekDayElem = document.createElement('span');
        cityBlock.append(weekDayElem);
        this.forecastElements.current.weekDayField = weekDayElem;

        // Элемент с сегодняшней датой 
        let dateElem = document.createElement('span');
        cityBlock.append(dateElem);
        this.forecastElements.current.dateField = dateElem;

        // Элемент с часами
        let clockContainer = document.createElement('span');
        cityBlock.classList.add('city-block');
        cityBlock.append(clockContainer);
        this.forecastElements.current.clockContainer = clockContainer;

        // Кнопка добавить город в список
        let addBtn = document.createElement('button');
        addBtn.setAttribute('type', 'button');
        addBtn.setAttribute('data-management-pane', '')
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
            forecastElem.append(dateElem);
            this.forecastElements.daily.dateField.push(dateElem);

            // Строка с иконками погоды
            let precipitationType = document.createElement('div');
            forecastElem.append(precipitationType);
            this.forecastElements.daily.precipitationField.push(precipitationType);

            // Строка с макс/мин температурой
            let temperatureElem = document.createElement('p');
            forecastElem.append(temperatureElem);
            this.forecastElements.daily.temperatureField.push(temperatureElem);

            // Строка с ветром
            let windElem = document.createElement('p');
            forecastElem.append(windElem);
            this.forecastElements.daily.windField.push(windElem);

            // Отрисовать карточку дня в контейнере
            forecastBlock.append(forecastElem)
        }
        container.append(forecastBlock);
    }

    static getForecastHourLabel(data) {
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

        // Создать и наполнить полями почасовые карточки
        for(let i = 0; i < 24; i++) {
            let forecastElem = document.createElement('div');
            forecastElem.classList.add('hourly-forecast-elem');
            forecastElem.style.minWidth = Math.round(container.offsetWidth / 4) - 4 + 'px';

            // Строка со временем и датой
            let timeElem = document.createElement('span');
            forecastElem.append(timeElem);
            this.forecastElements.hourly.timeField.push(timeElem);

            // Строка с температурой
            let temperatureElem = document.createElement('span');
            forecastElem.append(temperatureElem);
            this.forecastElements.hourly.temperatureField.push(temperatureElem);

            // Иконка с описанием погоды
            let precipitation = document.createElement('div');
            this.forecastElements.hourly.precipitationField.push(precipitation);

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
        this.renderHourlyForecast(mainWeatherBlockBottom);
    }

    initEventHandlers() {
        this.container.addEventListener('click', this.eventClickHandlers);

        this.citySearchForm.addEventListener('submit', this.formSubmitHandler);

        this.citySearchInput.addEventListener('focusin', this.inputFocusHandler);

        this.citySearchInput.addEventListener('input', this.inputAutocompleteHandler);
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
        }, 700)
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

        // Очищаем debounce и ставим флаг для отмены поиска на случай если getCityCoords() попал в очередь
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
        const openManagementPaneClick = event.target.closest('[data-management-pane]');
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
                    localStorage.removeItem(targetListElemTitle);
                    localStorage.setItem('currentCity', this.currentCity)
                    this.updateWeatherData();
                }, 400);
               
            } else {
                deleteBtnClick.firstElementChild.classList.add('fa-bounce');
                setTimeout(() => {
                    deleteBtnClick.firstElementChild.classList.remove('fa-bounce');
                    delete this.cityWeatherData[targetListElemTitle];
                    delete this.cityWeatherData[targetListElemTitle];
                    localStorage.removeItem(targetListElemTitle)
                    targetListElem.remove();
                }, 400);
            }
        }

        // Ну тут все очевидно надеюсь:) Если клик на "открыть панель управления"
        if(openManagementPaneClick) {
            // То блин открываем панель управления
            setTimeout( () => {
                this.renderCityManagementPane();
                // Добавляем обработчик на появившийся в разметке citySearchInput (он удаляется при clickOnGetBackBtn если что)
                this.citySearchInput.addEventListener('blur', this.inputBlurHandler);
            }, 250);
        }

        /*Если клик на город из списка - 
        выбираем город для отображения погоды*/
        if(clickOnCityTitle) {
            // Устанавливаем выбранный город текущим в экземпляр
            this.currentCity = clickOnCityTitle.querySelector('h2').textContent;
            // Так же устанавливаем выбранный город текущим в localStorage 
            localStorage.setItem('currentCity', this.currentCity);
            // Убираем панель управления
            this.mainWeatherBlock.querySelector('.city-management-pane').remove();
            // Обновляем разметку
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
            // Удаляем обработчик с citySearchInput
            this.citySearchInput.removeEventListener('blur', this.inputBlurHandler);
            // Закрываем панель управления
            setTimeout(() => {
                this.cancelSearch();
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
            // Ну тут все очевидно надеюсь:)
            setTimeout(() => {
                this.cancelSearch();
            }, 150);
        }
    }
}

let weatherWidget = new WeatherWidget(document.querySelector('.container'));