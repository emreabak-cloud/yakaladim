/***************************************************
==================== JS INDEX ======================
****************************************************
01. tp-instagram-slide
02. tp-tour-itinerary-slider-active
03. tp-tour-details-slider-active
04. tp-category-city-slider-active
05. tp-tour-city-slider-3-active
06. tp-testimonial-slide
07. tp-destination-two-slider
08. tp-testimonial-two-slider
09. tp-brands-slider
10. tp-destination-3-slider
11. tp-destination-5-slider
12. tp-feature-slider
13. tp-testimonial-4-slide
14. tp-destination-7-slider
15. tp-destination-8-slider
16. tp-testimonial-7-slider
17. tp-postbox-thumb-slider-active
18. tp-career-employ-slider
****************************************************/


(function ($) {
	"use strict";

	////////////////////////////////////////////////////
	// 01. tp-instagram-slide
	var swiper = new Swiper(".tp-instagram-slide", {
		spaceBetween: 20,
		loop: true,
		freemode: true,
		slidesPerView: 1,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 8000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
		breakpoints: {
			'1200': {
				slidesPerView: 5,
			},
			'991': {
				slidesPerView: 5,
			},
			'768': {
				slidesPerView: 4,
			},
			'576': {
				slidesPerView: 3,
			},
			'0': {
				slidesPerView: 2,
			},
		},
	});

	////////////////////////////////////////////////////
	// 02. tp-tour-itinerary-slider-active
	var testimonial = new Swiper('.tp-tour-itinerary-slider-active', {
		slidesPerView: 1,
		loop: true,
		autoplay: false,
		arrow: false,
		spaceBetween: 0,
		speed: 1000,
		a11y: false,

		// Navigation arrows
		navigation: {
			prevEl: '.tp-tour-itinerary-arrow-prev',
			nextEl: '.tp-tour-itinerary-arrow-next',
		},

	});

	////////////////////////////////////////////////////
	// 03. tp-tour-details-slider-active
	var testimonial = new Swiper('.tp-tour-details-slider-active', {
		slidesPerView: 1,
		loop: true,
		autoplay: false,
		arrow: false,
		spaceBetween: 0,
		speed: 1000,
		a11y: false,
		// Navigation arrows
		navigation: {
			prevEl: '.tp-tour-itinerary-arrow-prev',
			nextEl: '.tp-tour-itinerary-arrow-next',
		},

	});

	////////////////////////////////////////////////////
	// 04. tp-category-city-slider-active
	var testimonial = new Swiper('.tp-category-city-slider-active', {
		spaceBetween: 17,
		slidesPerView: 'auto',
		centeredSlides: false,
		freeMode: true,       
		allowTouchMove: true,  
		speed: 800,
		loop: false,

		navigation: {
			prevEl: '.tp-category-city-prev',
			nextEl: '.tp-category-city-next',
		},
	});

	////////////////////////////////////////////////////
	// 05. tp-tour-city-slider-3-active
	var testimonial = new Swiper('.tp-tour-city-slider-3-active', {
		spaceBetween: 0,
		slidesPerView: 1,
		centeredSlides: false,     
		allowTouchMove: true,  
		speed: 800,
		loop: true,
		navigation: {
			prevEl: '.tp-tour-city-slider-3-prev',
			nextEl: '.tp-tour-city-slider-3-next',
		},
	});

	////////////////////////////////////////////////////
	// 06. tp-testimonial-slide
	var swiper = new Swiper(".tp-testimonial-slide", {
		slidesPerView: 3,
		spaceBetween: 0,
		loop: true,
		breakpoints: {
			'1200': {
				slidesPerView: 3,
			},
			'991': {
				slidesPerView: 2,
			},
			'768': {
				slidesPerView: 1,
			},
			'576': {
				slidesPerView: 1,
			},
			'0': {
				slidesPerView: 1,
			},
		},
		pagination: {
			el: ".tp-testimonial-pagination",
		},
	});

	////////////////////////////////////////////////////
	// 07. tp-destination-two-slider
	var swiper = new Swiper(".tp-destination-two-slider", {
		spaceBetween: 32,
		loop: true,
		freemode: true,
		slidesPerView: 1,
		allowTouchMove: false,
		speed: 12000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
		breakpoints: {
			'1400': {
				slidesPerView: 4,
			},
			'1200': {
				slidesPerView: 3,
			},
			'991': {
				slidesPerView: 3,
			},
			'768': {
				slidesPerView: 2,
			},
			'576': {
				slidesPerView: 1,
			},
			'0': {
				slidesPerView: 1,
			},
		},
	});

	////////////////////////////////////////////////////
	// 08. tp-testimonial-two-slider
	let tp_testimonial_two_slider = new Swiper(".tp-testimonial-two-slider", {
        slidesPerView: 1,
        loop: true,
		spaceBetween: 20,
        allowTouchMove: true,
		centeredSlides: true,
		speed: 600,
		navigation: {
			prevEl: '.tp-testimonial-two-prev',
			nextEl: '.tp-testimonial-two-next',
		},
	});

	////////////////////////////////////////////////////
	// 09. tp-brands-slider
	let tp_brands_slider = new Swiper(".tp-brands-slider", {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		centeredSlides: true,
		allowTouchMove: false,
		speed: 8000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});

	////////////////////////////////////////////////////
	// 10. tp-destination-3-slider
	var swiper = new Swiper(".tp-destination-3-slider", {
		spaceBetween: 32,
		loop: true,
		freemode: true,
		slidesPerView: 1,
		allowTouchMove: true,
		speed: 600,
		autoplay: true,
		breakpoints: {
			'1600': {
				slidesPerView: 11,
			},
			'1400': {
				slidesPerView: 9,
			},
			'1200': {
				slidesPerView: 7,
			},
			'991': {
				slidesPerView: 6,
			},
			'768': {
				slidesPerView: 4,
			},
			'576': {
				slidesPerView: 4,
			},
			'0': {
				slidesPerView: 3,
			},
		},
		navigation: {
			prevEl: '.tp-testimonial-two-prev',
			nextEl: '.tp-testimonial-two-next',
		},
	});

	////////////////////////////////////////////////////
	// 11. tp-destination-5-slider
	var swiper = new Swiper(".tp-destination-5-slider", {
		spaceBetween: 24,
		loop: true,
		freemode: true,
		slidesPerView: 1,
		allowTouchMove: true,
		speed: 600,
		breakpoints: {
			'1400': {
				slidesPerView: 5,
			},
			'1200': {
				slidesPerView: 4,
			},
			'991': {
				slidesPerView: 3,
			},
			'768': {
				slidesPerView: 3,
			},
			'576': {
				slidesPerView: 2,
			},
			'0': {
				slidesPerView: 1,
			},
		},
		pagination: {
			el: ".tp-destination-5-pagination",
			clickable: true,
		},
	});

	////////////////////////////////////////////////////
	// 12. tp-feature-slider
	var swiper = new Swiper(".tp-feature-slider", {
		loop: true,
		slidesPerView: 3,
		centeredSlides: true,
        spaceBetween: 24,
		breakpoints: {
			'1200': {
				slidesPerView: 3,
			},
			'992': {
				slidesPerView: 2,
			},
			'768': {
				slidesPerView: 1,
			},
			'576': {
				slidesPerView: 1,
			},
			'0': {
				slidesPerView: 1,
			},
		},
		pagination: {
			el: ".tp-feature-pagination",
			clickable: true,
		},
	});

	////////////////////////////////////////////////////
	// 13. tp-testimonial-4-slide
	var swiper = new Swiper(".tp-testimonial-4-slide", {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		centeredSlides: true,
		allowTouchMove: false,
		speed: 8000,
		breakpoints: {
			'1200': {
				slidesPerView: 4,
			},
			'991': {
				slidesPerView: 3,
			},
			'768': {
				slidesPerView: 2,
			},
			'576': {
				slidesPerView: 2,
			},
			'0': {
				slidesPerView: 1,
			},
		},
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});

	////////////////////////////////////////////////////
	// 14. tp-destination-7-slider
	var swiper = new Swiper(".tp-destination-7-slider", {
		spaceBetween: 24,
		loop: true,
		slidesPerView: 1,
		breakpoints: {
			'1200': {
				slidesPerView: 4,
			},
			'991': {
				slidesPerView: 3,
			},
			'768': {
				slidesPerView: 3,
			},
			'576': {
				slidesPerView: 2,
			},
			'0': {
				slidesPerView: 1,
			},
		},
		pagination: {
			el: ".tp-destination-5-pagination",
			clickable: true,
		},
	});

	////////////////////////////////////////////////////
	// 15. tp-destination-8-slider
	var swiper = new Swiper(".tp-destination-8-slider", {
		spaceBetween: 24,
		loop: true,
		slidesPerView: 5,
		allowTouchMove: true,
		speed: 600,
		breakpoints: {
			'1400': {
				slidesPerView: 5,
			},
			'1400': {
				slidesPerView: 4,
			},
			'1200': {
				slidesPerView: 3,
			},
			'991': {
				slidesPerView: 3,
			},
			'768': {
				slidesPerView: 2,
			},
			'576': {
				slidesPerView: 2,
			},
			'0': {
				slidesPerView: 1,
			},
		},
		pagination: {
			el: ".tp-destination-5-pagination",
			clickable: true,
		},
	});

	////////////////////////////////////////////////////
	// 16. tp-testimonial-7-slider
	let tp_testimonial_7_slider = new Swiper(".tp-testimonial-7-slider", {
        slidesPerView: 1,
        loop: true,
		spaceBetween: 20,
        allowTouchMove: true,
		centeredSlides: true,
		speed: 600,
		navigation: {
			prevEl: '.tp-testimonial-two-prev',
			nextEl: '.tp-testimonial-two-next',
		},
	});

	////////////////////////////////////////////////////
	// 17. tp-postbox-thumb-slider-active
	var testimonial = new Swiper('.tp-postbox-thumb-slider-active', {
		slidesPerView: 1,
		loop: true,
		autoplay: false,
		arrow: false,
		spaceBetween: 0,
		speed: 1000,
		effect: 'fade',
		a11y: false,

		// Navigation arrows
		navigation: {
			prevEl: '.tp-postbox-arrow-prev',
			nextEl: '.tp-postbox-arrow-next',
		},

	});

	////////////////////////////////////////////////////
	// 18. tp-career-employ-slider
	let tp_career_employ_slider = new Swiper(".tp-career-employ-slider", {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		spaceBetween: 40,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 8000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});


})(jQuery);    