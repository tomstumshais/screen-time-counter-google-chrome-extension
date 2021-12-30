const EXTENSION_NAME = 'screenTimeExtension';
const EXTENSION_VERSION = 'v1';
const START_TIME_KEY = `${EXTENSION_NAME}_${EXTENSION_VERSION}_startTime`;
const TOTAL_SCREEN_TIME_KEY = `${EXTENSION_NAME}_${EXTENSION_VERSION}_totalScreenTime`;
// TODO: implement standing feature
// const TOTAL_SCREEN_TIME_STANDING_KEY = `${EXTENSION_NAME}_${EXTENSION_VERSION}_totalScreenTimeStanding`;
const TOTAL_TIME_OFF_KEY = `${EXTENSION_NAME}_${EXTENSION_VERSION}_totalTimeOff`;
const TIMER_RUNNING_TYPE_KEY = `${EXTENSION_NAME}_${EXTENSION_VERSION}_timerRunningType`;
const CONTENTS = {
  en: {
    start_workday: 'Start workday',
    end_workday: 'End workday',
    go_off: 'Go Off',
    back_to_screen: 'Back to screen',
  }
};

const btnWorkday = document.getElementById('btnWorkday');
const btnOnOff = document.getElementById('btnOnOff');
let currentInterval = null;
let totalTime = 0;

window.addEventListener('load', () => {
  chrome.storage.local.get([START_TIME_KEY, TIMER_RUNNING_TYPE_KEY], (result) => {
    const startTime = result[START_TIME_KEY];
    const timerRunningType = result[TIMER_RUNNING_TYPE_KEY];

    updateUITimers();
    updateUIButtons();

    if (timerRunningType === 'on_screen') {
      runScreenTimeTimer(startTime);
    }

    if (timerRunningType === 'off_screen') {
      runOffScreenTimer(startTime);
    }
  });
});

btnWorkday.addEventListener('click', async () => {
  let isWorkdayStarted = false;
  let btnTextContent = CONTENTS.en.start_workday;

  if (btnWorkday.textContent === CONTENTS.en.start_workday) {
    btnTextContent = CONTENTS.en.end_workday;
    isWorkdayStarted = true;
  }
  btnWorkday.textContent = btnTextContent;
  
  clearInterval(currentInterval);
  if (isWorkdayStarted) {
    startWorkday();
    updateUITimers();
    runScreenTimeTimer();
    btnOnOff.style.visibility = 'visible';

    return;
  }

  chrome.storage.local.get(TIMER_RUNNING_TYPE_KEY, (result) => {
    const timmerRunningType = result[TIMER_RUNNING_TYPE_KEY];
    
    if (timmerRunningType === 'on_screen') {
      saveTotalScreenTime();
      return;
    }
    
    saveTotalOffTime();
  });
  chrome.storage.local.remove(START_TIME_KEY);
  chrome.storage.local.remove(TIMER_RUNNING_TYPE_KEY);
  btnOnOff.style.visibility = 'hidden';
});

btnOnOff.addEventListener('click', async () => {
  let isOffScreen = false;
  let btnTextContent = CONTENTS.en.go_off;

  if (btnOnOff.textContent === CONTENTS.en.go_off) {
    btnTextContent = CONTENTS.en.back_to_screen;
    isOffScreen = true;
  }
  btnOnOff.textContent = btnTextContent;

  clearInterval(currentInterval);
  if (isOffScreen) {
    saveTotalScreenTime();
    runOffScreenTimer();

    return;
  }

  saveTotalOffTime();
  runScreenTimeTimer();
});


/**
 * Functions
 */
function timeCounter(timeType, startTime, previousTime = 0) {
  const now = currentTime();
  const time = previousTime + (now - startTime); 
  const UITime = getUITime(time);
  const hoursElement = document.querySelector(`#${timeType}Hours`);
  const minutesElement = document.querySelector(`#${timeType}Minutes`);
  const secondsElement = document.querySelector(`#${timeType}Seconds`);
  
  hoursElement.innerHTML = UITime.hours;
  minutesElement.innerHTML = UITime.minutes;
  secondsElement.innerHTML = UITime.seconds;
  totalTime = time;
}

function zeroPrefix(i) {
  if (i < 10) {
    i = '0' + i
  } 

  return i;
}

function currentTime() {
  return Math.floor(Date.now() / 1000);
}

function getUITime(time) {
  const hour = Math.floor(time / 3600);
  const minute = Math.floor((time / 60) % 60);
  const second = Math.floor(time % 60);

  return {
    hours: zeroPrefix(hour),
    minutes: zeroPrefix(minute),
    seconds: zeroPrefix(second),
  };
}

function updateUITimers() {
  chrome.storage.local.get([TOTAL_SCREEN_TIME_KEY, TOTAL_TIME_OFF_KEY, TIMER_RUNNING_TYPE_KEY], (result) => {
    const previousScreenTime = result[TOTAL_SCREEN_TIME_KEY] || 0;
    const previousOffTime = result[TOTAL_TIME_OFF_KEY] || 0;
    const timerRunningType = result[TIMER_RUNNING_TYPE_KEY];

    if (timerRunningType !== 'on_screen') {
      const UITime = getUITime(previousScreenTime);
      document.querySelector('#screenTimeHours').innerHTML = UITime.hours;
      document.querySelector('#screenTimeMinutes').innerHTML = UITime.minutes;
      document.querySelector('#screenTimeSeconds').innerHTML = UITime.seconds;
    }

    if (timerRunningType !== 'off_screen') {
      const UITime = getUITime(previousOffTime);
      document.querySelector('#offTimeHours').innerHTML = UITime.hours;
      document.querySelector('#offTimeMinutes').innerHTML = UITime.minutes;
      document.querySelector('#offTimeSeconds').innerHTML = UITime.seconds;
    }
  });
}

function runScreenTimeTimer(startTime = 0) {
  setTimerRunningType('on_screen');
  const time = startTime || currentTime();

  chrome.storage.local.set({[START_TIME_KEY]: time});

  chrome.storage.local.get([TOTAL_SCREEN_TIME_KEY], (result) => {
    const previousScreenTime = result[TOTAL_SCREEN_TIME_KEY];
    currentInterval = setInterval(timeCounter, 500, 'screenTime', time, previousScreenTime);
  });
}

function runOffScreenTimer(startTime = 0) {
  setTimerRunningType('off_screen');
  const time = startTime || currentTime();

  chrome.storage.local.set({[START_TIME_KEY]: time});

  chrome.storage.local.get([TOTAL_TIME_OFF_KEY], (result) => {
    const previousOffTime = result[TOTAL_TIME_OFF_KEY];
    currentInterval = setInterval(timeCounter, 500, 'offTime', time, previousOffTime);
  });
}

function saveTotalScreenTime() {
  chrome.storage.local.set({[TOTAL_SCREEN_TIME_KEY]: totalTime});
}

function saveTotalOffTime() {
  chrome.storage.local.set({[TOTAL_TIME_OFF_KEY]: totalTime});
}

function startWorkday() {
  chrome.storage.local.remove(TOTAL_SCREEN_TIME_KEY);
  chrome.storage.local.remove(TOTAL_TIME_OFF_KEY);
}

function setTimerRunningType(type) {
  chrome.storage.local.set({[TIMER_RUNNING_TYPE_KEY]: type});
}

function updateUIButtons() {
  chrome.storage.local.get(TIMER_RUNNING_TYPE_KEY, (result) => {
    const timmerRunningType = result[TIMER_RUNNING_TYPE_KEY];
    const contents = CONTENTS.en;
    
    btnWorkday.innerHTML = timmerRunningType ? contents.end_workday : contents.start_workday;
    btnOnOff.innerHTML = timmerRunningType === 'off_screen' ? contents.back_to_screen : contents.go_off;
    btnOnOff.style.visibility = timmerRunningType ? 'visible' : 'hidden';
  });
}