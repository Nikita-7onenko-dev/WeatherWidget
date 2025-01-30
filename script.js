// Виджет прогноз погоды с помощью класса, fetch и API 


class WeatherWidget {
    constructor(container) {
        this.container = container;
        this.mainWeatherBlock = document.createElement('div');
        this.cityMainTitle = document.createElement('h2');
        this.currentCity = "Киев";
        this.clockId = null;
        this.searchResultsPane = document.createElement('div');
        this.citySearchResult = null;
        this.latitude = 0;
        this.longitude = 0;

        this.listOfAddedCities = document.createElement('div');
        this.citySearchForm = document.createElement('form');
        this.cancelSearchBtn = document.createElement('button');
        this.citySearchInput = document.createElement('input');

        this.eventClickHandlers = this.eventClickHandlers.bind(this);
        this.formSubmitHandler = this.formSubmitHandler.bind(this);
        this.inputFocusHandler = this.inputFocusHandler.bind(this);
        this.inputBlurHandler = this.inputBlurHandler.bind(this);
        this.init();
    }

    init() {
        this.fetchWeather();
        this.initEventHandlers();
    }

    cityCoordinates = {
        "Киев": { latitude: 50.450001, longitude: 30.523333 },
    }

    cityWeatherKeys = {

    }

    sortCities() {
        this.cityCoordinates = Object.fromEntries(
                Object.entries(this.cityCoordinates)
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
        this.defineBackgroundImage(this.citySearchInput);
        this.citySearchInput.placeholder = 'Введите местоположение';
        // Добавить иконку-лупу
        this.citySearchForm.innerHTML ='<i class="fa-solid fa-magnifying-glass"></i>';
        this.citySearchForm.append(this.citySearchInput);

        // Список добавленных городов
        this.listOfAddedCities.classList.add('list-of-added-cities');
        cityManagementPane.append(this.listOfAddedCities);
        // Наполнить список городами
        this.renderCityList(this.listOfAddedCities);
        // Определить фоновое изображение для каждого города в списке
        this.defineBackgroundImage(cityManagementPane.querySelector('.list-elem'));
    }

    async getCityCoords() {

         let chosenCity = this.citySearchInput.value;
        if(!chosenCity) {
            return;
        }
        if(this.cityCoordinates[chosenCity]){
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
            
            if(this.citySearchResult.length === 0) {
                alert("Ничего не найдено уточните ваш запрос");
                return;
            } /* else if(this.citySearchResult.length === 1) {
                this.processingSingleCity(this.citySearchResult, 0);
            }  */else {
                this.renderSearchResults(this.citySearchResult)
            }
    
        } catch(error) {
            alert("Йой, ошибка при запросе координат");
            console.log(error);
        }
    }

    renderSearchResults(citySearchResult) {
        // Панель результатов поиска 
        this.searchResultsPane.innerHTML = "";
        this.searchResultsPane.classList.add('search-results-pane');
        // Подсказка
        let tooltip = document.createElement('p');
        tooltip.textContent = `Если полученных результатов недостаточно,
            уточните ваш запрос`;
        // Рендер
        this.searchResultsPane.append(tooltip);
        this.mainWeatherBlock.querySelector('.city-management-pane').append(this.searchResultsPane);
        // Наполнить панель результатами и добавить индекс к результату
        for(let i = 0; i < citySearchResult.length; i++) {
            let searchResultElem = document.createElement('p');
            searchResultElem.setAttribute('data-search-index', [i]);
            searchResultElem.classList.add('search-results-elem');
            searchResultElem.textContent = citySearchResult[i].display_name;
            this.searchResultsPane.append(searchResultElem);
        }
    }

    processingSingleCity(citySearchResult, index, isAddToCityListOnly) {
        
        if(isAddToCityListOnly) {
        // Просто добавить город в список?
            this.latitude = citySearchResult[index].lat;
            this.longitude = citySearchResult[index].lon;
            this.cityCoordinates[citySearchResult[index].name] = {longitude: this.longitude, latitude: this.latitude};
            this.sortCities()
            this.fetchWeather(true, citySearchResult[index].name);
            return;
        }

        // Обработать выбранный город
        this.currentCity = citySearchResult[index].name;
        this.latitude = citySearchResult[index].lat;
        this.longitude = citySearchResult[index].lon;
        this.cityCoordinates[citySearchResult[index].name] = {longitude: this.longitude, latitude: this.latitude};
        this.sortCities()
        this.cityMainTitle.textContent = this.currentCity;
        this.fetchWeather();
    }

    async fetchWeather(isShortMode, cityName) {

    let params;

        if (isShortMode) {
            params = {
                latitude: this.cityCoordinates[cityName].latitude,
                longitude : this.cityCoordinates[cityName].longitude,
                timezone: "auto",
                current: "temperature_2m,weather_code,is_day",
                daily: "temperature_2m_max,temperature_2m_min",
            };

        } else {
            params = {
                latitude: this.cityCoordinates[this.currentCity].latitude,
                longitude : this.cityCoordinates[this.currentCity].longitude,
                timezone: "auto",
                current: "temperature_2m,wind_speed_10m,rain,snowfall,weather_code,relative_humidity_2m,is_day,precipitation,wind_direction_10m",
                wind_speed_unit: "ms",
                forecast_days: "7",
                daily: "sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant",
                hourly: "temperature_2m,precipitation_probability,weather_code",
            };
        }

        const url = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams( params ).toString()}`;

        try {    
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Ошибка сервера ${response.status}`);
            }
    
            const weatherData = await response.json();

            if(isShortMode) {
                this.renderCityList(this.listOfAddedCities, weatherData, cityName);
                return; 
            }
            console.log(weatherData);
            this.renderMainWeatherBlock(weatherData);
        } catch(error) {
            alert("Ошибка при запросе погодных данных");
            console.log(error);
        }
    }

    convertWindAzimuth(data, isShortMode) {
        if(isShortMode) {
            switch (true) {
                case (data === 0 || data === 360):
                    return "С";
                case (data > 0 && data < 90):
                    return "С-В";
                case (data === 90): 
                    return "В";
                case (data > 90 && data < 180):
                    return "Ю-В";
                case (data === 180):
                    return "Ю";
                case (data > 180 && data < 270):
                    return "Ю-З";
                case (data === 270):
                    return "З";
                case (data > 270 && data < 360):
                    return "С-З";
            };
        }

        switch (true) {
            case (data === 0 || data === 360):
                return "Северный";
            case (data > 0 && data < 90):
                return "Северо-восточный";
            case (data === 90): 
                return "Восточный";
            case (data > 90 && data < 180):
                return "Юго-восточный";
            case (data === 180):
                return "Южный";
            case (data > 180 && data < 270):
                return "Юго-западный";
            case (data === 270):
                return "Западный";
            case (data > 270 && data < 360):
                return "Северо-западный";
        };
    }

    getWeatherKey(data, cityNameForWeatherKey) {
        let timeOfDay = data.current.is_day > 0 ? 'day' : 'night';
        let precipitationType;
        
        if (data.current.weather_code === 0) {
            precipitationType = "clear";
        } else if (data.current.weather_code > 0 && data.current.weather_code <= 48) {
            precipitationType = "cloud";
        } else if ( (data.current.weather_code >= 51 && data.current.weather_code <= 67) ||
        (data.current.weather_code >= 80 && data.current.weather_code <= 99) ) {
            precipitationType = "rain";
        } else if (data.current.weather_code >= 71 && data.current.weather_code <= 77) {
            precipitationType = "snow";
        }

        // Запомнить текущую погоду и время суток для расчета фонового изображения
        if(cityNameForWeatherKey) {
            this.cityWeatherKeys[cityNameForWeatherKey] = `${precipitationType}_${timeOfDay}`;
        } else {
            this.cityWeatherKeys[this.currentCity] = `${precipitationType}_${timeOfDay}`;
        }
        
        return `${precipitationType}_${timeOfDay}`;
    }

    updateWeatherKeys() {
        
    }

    clockRender(container, data) {
        if (this.clockId) {
            clearInterval(this.clockId);
        }

        let timeZone = data.timezone;

        // Возвращает объект-опций для форматирования времени
        let formatter = new Intl.DateTimeFormat(undefined, {
            timeZone: timeZone,
            hour: "2-digit",
            minute: "2-digit",
            second: '2-digit',
        });

        const render = () => {
            let currentTime = formatter.format(new Date());
           let [hours, minutes, seconds] = currentTime.split(":");
            container.innerHTML = `
                <b>${hours}</b>:<b>${minutes}</b>:<b>${seconds}</b>
            `;

        // Авто-обновление каждые 15 минут
            if ( (Number(minutes) % 15 === 0) && seconds === '00') { 
                setTimeout( () => {
                    this.fetchWeather();
                }, 1000); 
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

        // Если нужно округлить до ближайшего часа для расчета иконок
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
            sunsetTime = sunriseTime.slice(1)
        }
        return [sunriseTime, sunsetTime];
    }

    renderTemperatureBlock(container, data) {

        let temperatureBlock = document.createElement('div');   
        temperatureBlock.classList.add('temperature-block');

        // Наполнить блок данными
        temperatureBlock.innerHTML = `
            <b>
                ${data.current.temperature_2m} 
                <span>${data.current_units.temperature_2m}</span>
            </b>
            <p>
                ${this.weatherCodeInterpreter(data.current.weather_code)}
            </p>
            <p>
                Ветер: ${data.current.wind_speed_10m} М/с<br>
                ${this.convertWindAzimuth(data.current.wind_direction_10m)}
            </p>
            <p>
                Влажность ${data.current.relative_humidity_2m}%
            </p>
            <p>
                Рассвет ${this.processingSunriseSunsetTime(data)[0]}<br>
                Закат ${this.processingSunriseSunsetTime(data)[1]}
            </p>
            `;
      
        // Отрисовать блок с данными в контейнере
        container.append(temperatureBlock);

    }

    renderCItyBlock(data, container) {

        // Элемент с названием города
        let cityBlock = document.createElement('div');
        this.cityMainTitle.textContent = this.currentCity;
        cityBlock.append(this.cityMainTitle);

        // Строка с днем недели
        const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
        const currentDayOfWeek = daysOfWeek[this.getEuroDay(new Date(data.current.time)) - 1];
        let weekDayElem = document.createElement('span');
        weekDayElem.textContent = currentDayOfWeek;
        cityBlock.append(weekDayElem);

        // Элемент с сегодняшней датой 
        let dateElem = document.createElement('span');
        // Сегодняшняя дата в массиве данных под индексом 1
        dateElem.textContent = this.dateFormatting(data.daily.time[0]);
        cityBlock.append(dateElem);

        // Элемент с часами
        let clockContainer = document.createElement('span');
        cityBlock.classList.add('city-block');
        this.clockRender(clockContainer, data);
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

    renderCityList(container, data, cityName) {
        // Создать открывающийся список городов
        container.innerHTML = "";
        // Сортируем объект с городами перед отрисовкой
        this.sortCities();
        // Наполняем список городов из объекта с данными
        Object.keys(this.cityCoordinates).forEach(key => {
            let listElem = document.createElement('div');
            listElem.classList.add('list-elem');
            const cityInfoElement = document.createElement('div');
            const temperatureElem = document.createElement('span');

            
/*             if(data) {
                temperatureElem.innerHTML = `${data.current.temperature_2m} + ${data.current_units.temperature_2m}`;
            } */


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
   
            if(key === cityName) {
                this.defineBackgroundImage(listElem, data, cityName);
            } else {
                this.defineBackgroundImage(listElem, false, key);
            }
            container.append(listElem);
        });
    }
    
    renderDailyForecast(container, data) {
        // Блок с карточками прогнозов
        let forecastBlock = document.createElement('div');
        forecastBlock.classList.add('daily-forecast-block');

        // Создать и наполнить данными карточки
        for(let i = 0; i < data.daily.time.length; i++) {   
            let forecastElem = document.createElement('div');
            forecastElem.classList.add('daily-forecast-elem');
            forecastElem.style.minWidth = Math.round(container.offsetWidth / 3) - 4 + 'px';

            // Рассчитать текущий день недели
            const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
            const currentDayOfWeek = daysOfWeek[this.getEuroDay(new Date(data.daily.time[i])) - 1];
            
            // Строка с датой
            let dateElem = document.createElement('span');
            dateElem.innerHTML = `${this.dateFormatting(data.daily.time[i], true)} ${currentDayOfWeek}`;
            if(i === 0) {
                dateElem.innerHTML = `${this.dateFormatting(data.daily.time[i], true)} ${currentDayOfWeek}<br>Сегодня`;
            }
            forecastElem.append(dateElem);

            // Строка с иконками погоды
            let precipitationType = document.createElement('div');
            precipitationType.innerHTML =  this.weatherCodeInterpreter(data.daily.weather_code[i], true);
            forecastElem.append(precipitationType);

            // Строка с макс/мин температурой
            let tempElem = document.createElement('p');
            tempElem.innerHTML = `
                Макс ${data.daily.temperature_2m_max[i]} ${data.daily_units.temperature_2m_max}<br>
                Мин ${data.daily.temperature_2m_min[i]} ${data.daily_units.temperature_2m_min}
            `;
            forecastElem.append(tempElem);

            // Строка с ветром
            let windElem = document.createElement('p');
            windElem.innerHTML = `
                Ветер ${data.daily.wind_speed_10m_max[i]}М/с,<br>
                ${this.convertWindAzimuth(data.daily.wind_direction_10m_dominant[i], true)}
            `;
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

    renderHourlyForecast(container, data) {
        // Блок с карточками прогнозов
        let forecastBlock = document.createElement('div');
        forecastBlock.classList.add('hourly-forecast-block');
        forecastBlock.style.display = 'none';
        let sunriseHour = this.processingSunriseSunsetTime(data, true)[0];
        let sunsetHour = this.processingSunriseSunsetTime(data, true)[1];

        // Создать и наполнить данными почасовые карточки

        // Т.к. сервер возвращает прогноз с текущей даты 00:00, то
        // Стартовое значение счетчика будет = текущий час
        let currentHour = new Date(data.current.time).getHours();
        // А конечное 24(сутки) + текущий час
        for(let i = currentHour; i < currentHour + 24; i++) {
            let forecastElem = document.createElement('div');
            forecastElem.classList.add('hourly-forecast-elem');
            forecastElem.style.minWidth = Math.round(container.offsetWidth / 4) - 4 + 'px';

            // Рассчитать текущий день недели
            const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
            let currentDayOfWeek = daysOfWeek[this.getEuroDay(new Date(data.hourly.time[i])) - 1];
            let currentDate = data.hourly.time[i];

            // Строка со временем и датой
            let timeElem = document.createElement('span');
            timeElem.innerHTML = `${this.dateFormatting(currentDate, true)} ${currentDayOfWeek}<br>${this.getForecastHourLabel(data.hourly.time[i])}`;
            if ( i == currentHour) {
                timeElem.innerHTML = `${this.dateFormatting(currentDate, true)} ${currentDayOfWeek}<br>${this.getForecastHourLabel(data.hourly.time[i])}<br>Сейчас`;
            }
            forecastElem.append(timeElem);

            // Строка с температурой
            let tempElem = document.createElement('span');
            tempElem.textContent = data.hourly.temperature_2m[i] + data.hourly_units.temperature_2m;
            forecastElem.append(tempElem);

            // Иконка с описанием погоды
            let precipitation = document.createElement('div');
            let forecastHour = new Date(data.hourly.time[i]).getHours();
            // Отрисовать иконку соответственно времени суток
            if (forecastHour === sunriseHour && sunriseHour !== sunsetHour) {
                // Сейчас рассвет
                precipitation.innerHTML = '<i class="wi wi-sunrise"></i>';
            } else if(forecastHour === sunsetHour && sunriseHour !== sunsetHour) {
                // Сейчас закат
                precipitation.innerHTML = '<i class="wi wi-sunset"></i>';
            } else if (forecastHour < sunriseHour || forecastHour > sunsetHour) {
                // Сейчас ночь
                precipitation.innerHTML = this.weatherCodeInterpreter(data.hourly.weather_code[i], true, true);
            } else {
                // Сейчас день
                precipitation.innerHTML = this.weatherCodeInterpreter(data.hourly.weather_code[i], true);
            }

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
        dailyBtn.setAttribute('type', 'button');
        dailyBtn.setAttribute('data-forecast-toggler', 'daily-forecast');
        dailyBtn.textContent = "На неделю";
        dailyBtn.classList.add('btn');
        // Стили для выбранной кнопки, по умолчанию - прогноз по дням
        dailyBtn.style.backgroundColor = '#726e8d74';
        dailyBtn.style.fontWeight = '500';
        dailyBtn.style.border = '1px solid #fff';
        toggler.append(dailyBtn);

        // Прогноз по часам
        const hourlyBtn = document.createElement('button');
        hourlyBtn.setAttribute('type', 'button');
        hourlyBtn.setAttribute('data-forecast-toggler', 'hourly-forecast');
        hourlyBtn.textContent = "По часам";
        hourlyBtn.classList.add('btn');
        toggler.append(hourlyBtn);

    }

    defineBackgroundImage(target, data, cityName){
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

        let currentWeatherKey;
        if(data) {
            // Если есть текущие данные получаем ключ исходя из них
            currentWeatherKey = this.getWeatherKey(data, cityName);
        } else if(target.firstElementChild) {
            // Если текущих данных нет, берем ключ из памяти по названию таргет-города (для списка добавленных городов)
            currentWeatherKey = this.cityWeatherKeys[target.firstElementChild.textContent];
        } else {
            // Если текущих данных нет, и расчет не для списка городов - берем ключ по названию, отображаемого в основной панели, города (для input в панели управления городами)
            currentWeatherKey = this.cityWeatherKeys[this.currentCity];
        }
        let backgroundImageUrl = backgroundUrls[currentWeatherKey];
        target.style.backgroundImage = `url('${backgroundImageUrl}')`;
    }

    renderMainWeatherBlock(data) {
        // Общий блок 
        this.mainWeatherBlock.innerHTML = "";
        // Расчет фонового изображения для общего блока
        this.defineBackgroundImage(this.mainWeatherBlock, data);

        this.mainWeatherBlock.classList.add('main-wether-block');
        const mainWeatherBlockTop = document.createElement('div');
        mainWeatherBlockTop.classList.add('main-weather-block-top');

        // Отрисовка всего:
        
        // Основной блок
        this.container.prepend(this.mainWeatherBlock);

        // Верх
        this.mainWeatherBlock.prepend(mainWeatherBlockTop);
        // Блок с температурой и ветром
        this.renderTemperatureBlock(mainWeatherBlockTop, data);
        // Блок с городом, датой, часами и кнопками
        this.renderCItyBlock(data, mainWeatherBlockTop);

        // Низ 
        const mainWeatherBlockBottom = document.createElement('div');
        mainWeatherBlockBottom.classList.add('main-weather-block-bottom');
        this.mainWeatherBlock.append(mainWeatherBlockBottom);
        // Переключатель прогноза часовой\недельный
        this.renderForecastToggler(mainWeatherBlockBottom);
        // Недельный прогноз
        this.renderDailyForecast(mainWeatherBlockBottom, data);
        // Почасовой прогноз
        this.renderHourlyForecast(mainWeatherBlockBottom, data)
    }

    initEventHandlers() {
        this.container.addEventListener('click', this.eventClickHandlers);

        this.citySearchForm.addEventListener('submit', this.formSubmitHandler);

       this.citySearchInput.addEventListener('focusin', this.inputFocusHandler);



    }

    formSubmitHandler(event) {
        event.preventDefault();

        if(event.target.elements[0].value) {
            this.getCityCoords(event.target.elements[0].value);
            event.target.value = '';
        }
    }

    inputFocusHandler() {

        this.mainWeatherBlock.querySelector('.list-of-added-cities').style.display = 'none';

        this.citySearchForm.firstElementChild.classList.add('fa-shake')

        this.cancelSearchBtn.classList.add('cancel-search-Btn');
        this.cancelSearchBtn.setAttribute('type', 'button');
        this.cancelSearchBtn.textContent = 'Отмена';

        this.citySearchForm.append(this.cancelSearchBtn);
    }

    inputBlurHandler() {
        this.citySearchForm.firstElementChild.classList.remove('fa-shake');
    }

    cancelSearch() {
        /* Метод для выхода из режима поиска для кнопок 
        "Выйти из панели управления городами", "Отменить поиск" или
        если выбран результат поиска */

        // Возвращаем отображаем список городов
        this.mainWeatherBlock.querySelector('.list-of-added-cities').style.display = 'flex';
        // Сбрасываем и расфокусируем форму
        this.citySearchForm.elements[0].value = '';
        this.citySearchForm.elements[0].blur();
        this.citySearchForm.firstElementChild.classList.remove('fa-shake');

        if(document.querySelector('.cancel-search-Btn')){
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
        const clickOnCityTitle = event.target.closest('.list-elem > div > h2');
        const addBtnClick = event.target.closest('[data-action]');
        const clickOnSearchResult = event.target.dataset.searchIndex;
        const clickOnGetBackBtn = event.target.closest('.get-back-btn');
        const clickOnForecastToggler = event.target.closest('[data-forecast-toggler]');
        const clickOnSearchCancelBtn = event.target.closest('.cancel-search-Btn');



        //Если клик по кнопке удаления
        if (deleteBtnClick) {
            const targetListElem = event.target.closest('.list-elem');
            const targetListElemTitle = targetListElem.children[0].textContent;
            // Если добавленный в список город всего 1 - не удалять
            if(this.listOfAddedCities.children.length === 1) return;
            // Если удаляем текущий город - запросить данные на следующий
            if (targetListElemTitle === this.currentCity) {    
                setTimeout(() => {
                    targetListElem.remove();
                    delete this.cityCoordinates[targetListElemTitle];
                    this.currentCity = this.listOfAddedCities.firstElementChild.children[0].textContent;
                    this.fetchWeather();
                }, 250);
            } else {
                setTimeout(() => {
                    targetListElem.remove();
                    delete this.cityCoordinates[targetListElemTitle];
                }, 250);
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
            this.currentCity = event.target.textContent;
            this.cityMainTitle.textContent = this.currentCity;

            setTimeout( () => {
                    this.fetchWeather();
            }, 250);


        };

        // Выбрать подходящий результат поиска
        if(clickOnSearchResult) {
            setTimeout(() => {
                const searchResultIndex = event.target.dataset.searchIndex;
                this.processingSingleCity(this.citySearchResult, searchResultIndex, true);

                this.cancelSearch()
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

                dailyBtn.style.backgroundColor = '#726e8d74';
                dailyBtn.style.fontWeight = '500';
                dailyBtn.style.border = '1px solid #fff';

                hourlyBtn.style.backgroundColor = '';
                hourlyBtn.style.fontWeight = '';
                hourlyBtn.style.border = '';

                dailyForecast.style.display = '';
                hourlyForecast.style.display = 'none'
            } else if(event.target.dataset.forecastToggler == 'hourly-forecast') {
                
                hourlyBtn.style.backgroundColor = '#726e8d74';
                hourlyBtn.style.fontWeight = '500';
                hourlyBtn.style.border = '1px solid #fff';

                dailyBtn.style.backgroundColor = '';
                dailyBtn.style.fontWeight = '';
                dailyBtn.style.border = '';

                hourlyForecast.style.display = '';
                dailyForecast.style.display = 'none'
            }
        }

        // Если клик на кнопку "отменить поиск"
        if(clickOnSearchCancelBtn) {
            setTimeout(() => {
                this.cancelSearch()
            }, 150);
        }
    }
}

let weatherWidget = new WeatherWidget(document.querySelector('.container'));
