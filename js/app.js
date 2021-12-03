// бургер меню
function burgerMenu(selector) {
    let menu = $(selector);
    let button = menu.find(".burger__menu--button");
    let links = menu.find('.burger__menu--link');
    let overlay = menu.find('.burger__menu__overlay');

    button.on('click', (e) => {
        e.preventDefault();
        toggleMenu();
    });

    links.on('click', () => toggleMenu());
    overlay.on('click', () => toggleMenu());


    function toggleMenu() {
        menu.toggleClass('burger__menu--active');
    }
}
burgerMenu(".burger__menu");


//скролл ко 2 блоку в блоке
$("[data-scroll]").on("click", function (event) {
    event.preventDefault();

    var blockId = $(this).data("scroll");
    blockOffset = $(blockId).offset().top;

    console.log(blockOffset);

    $("html, body").animate({ scrollTop: blockOffset }, 500);
});
//скролл к Связаться с нами
$("[data-scroll]").on("click", function (event) {
    event.preventDefault();

    var blockId = $(this).data("scroll");
    blockOffset = $(blockId).offset().top;

    console.log(blockOffset);

    $("html, body").animate({ scrollTop: blockOffset }, 500);
});


// Анимация печатной машинки
$(document).ready(function () {
    var typed = new Typed('.chenging__text--type', {
        strings: ['Web-design &amp; App design', 'Branding', 'Motion design', 'Packaging &amp; Print'],
        typeSpeed: 80,
        backSpeed: 60,
        loop: true,
        backDelay: 1500
    });
});
$(document).ready(function () {
    var typed = new Typed('.chenging__text--design--type', {
        strings: ['Мир. Дружба. Газпром.'],
        typeSpeed: 80,
        backSpeed: 60,
        loop: true,
        backDelay: 1500
    });
});
$(document).ready(function () {
    var typed = new Typed('.chenging__text--website--type', {
        strings: ['We love what we do'],
        typeSpeed: 80,
        backSpeed: 60,
        loop: true,
        backDelay: 1500
    });
});
$(document).ready(function () {
    var typed = new Typed('.chenging__text--alfa', {
        strings: ['Design', 'Branding', 'Motion'],
        typeSpeed: 80,
        backSpeed: 60,
        loop: true,
        backDelay: 1500
    });
});


// Скрыть header внизу страинцы
const burger = document.querySelector(".burger__menu--button");
const blockProject = $(contacts).offset().top;
const scrollPosition = () => window.pageYOffset || document.documentElement.scrollTop;
const containHide = () => burger.classList.contains('hide');

window.addEventListener('scroll', () => {
    if (scrollPosition() > blockProject - 150 && !containHide()) {
        burger.classList.add('hide');

    } else if (scrollPosition() < blockProject - 150 && containHide()) {
        burger.classList.remove('hide');
    }
});


//Фон для контактов
VANTA.FOG({
    el: "#bg--contacts",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    highlightColor: 0x77ff,
    midtoneColor: 0xc6dfff,
    lowlightColor: 0xffffff,
    baseColor: 0x2865ff,
    blurFactor: 0.90,
    speed: 5.00,
    zoom: 0.30
});


// Parallax
$('.img-parallax').each(function () {
    var img = $(this);
    var imgParent = $(this).parent();
    function parallaxImg() {
        var speed = img.data('speed');
        var imgY = imgParent.offset().top;
        var winY = $(this).scrollTop();
        var winH = $(this).height();
        var parentH = imgParent.innerHeight();


        // The next pixel to show on screen
        var winBottom = winY + winH;

        // If block is shown on screen
        if (winBottom > imgY && winY < imgY + parentH) {
            // Number of pixels shown after block appear
            var imgBottom = ((winBottom - imgY) * speed);
            // Max number of pixels until block disappear
            var imgTop = winH + parentH;
            // Porcentage between start showing until disappearing
            var imgPercent = ((imgBottom / imgTop) * 100) + (50 - (speed * 50));
        }
        img.css({
            top: imgPercent + '%',
            transform: 'translate(-50%, -' + imgPercent + '%)'
        });
    }
    $(document).on({
        scroll: function () {
            parallaxImg();
        }, ready: function () {
            parallaxImg();
        }
    });
});


// change scale
function changeItem() {
    document.getElementById('imgScaleCar').style.transform = 'scale(1.1)';
}
function changeItem2() {
    document.getElementById('imgScaleSphere').style.transform = 'scale(1.1)';
}
function changeItem3() {
    document.getElementById('imgScaleBoba').style.transform = 'scale(1.1)';
}
function changeItem4() {
    document.getElementById('imgScaleCar2').style.transform = 'scale(1.1)';
}
function changeImgBranding1() {
    document.getElementById('imgBranding1').style.transform = 'scale(1.1)';
}
function changeImgBranding2() {
    document.getElementById('imgBranding2').style.transform = 'scale(1.1)';
}
function changeImgBranding3() {
    document.getElementById('imgBranding3').style.transform = 'scale(1.1)';
}
function changeImgBranding4() {
    document.getElementById('imgBranding4').style.transform = 'scale(1.1)';
}

function rechangeItem() {
    document.getElementById('imgScaleCar').style.transform = 'scale(1)';
}
function rechangeItem2() {
    document.getElementById('imgScaleSphere').style.transform = 'scale(1)';
}
function rechangeItem3() {
    document.getElementById('imgScaleBoba').style.transform = 'scale(1)';
}
function rechangeItem4() {
    document.getElementById('imgScaleCar2').style.transform = 'scale(1)';
}
function rechangeBranding1() {
    document.getElementById('imgBranding1').style.transform = 'scale(1)';
}
function rechangeBranding2() {
    document.getElementById('imgBranding2').style.transform = 'scale(1)';
}
function rechangeBranding3() {
    document.getElementById('imgBranding3').style.transform = 'scale(1)';
}
function rechangeBranding4() {
    document.getElementById('imgBranding4').style.transform = 'scale(1)';
}
