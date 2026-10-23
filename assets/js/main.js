/***************************************************
==================== JS INDEX ======================
****************************************************
01. PreLoader Js
02. Nice Select Js
03. mobile menu Js
04. Sticky Header Js
05. offcanvas
06. filter
07. Common Js
08. back-to-top
09. magnificPopup img view
10. Counter Js
11. tp-booking-toggle
12. tp-multi-datepicker
13. E-commerce plus minus js
14. tp-booking-location-input
15. tp-filter-collapse
18. time-picker
19. tp-header-top-lang-toggle
20. tp-header-top-currency-toggle
21. tp-about-col-custom
22. typed-text
23. tp-header-top-lang-toggle
24. Wow Js
25. tp file upload drag effect
26. Password Toggle Js 
27. E-commerce plus minus js
****************************************************/

(function ($) {
	"use strict";

	var windowOn = $(window);
	////////////////////////////////////////////////////
	// 01. PreLoader Js
	windowOn.on('load', function () {
		$("#loading").fadeOut(500);
		wowAnimation();
	});

	// 02. Nice Select Js
	$('.tp-select').niceSelect();

	////////////////////////////////////////////////////
	// 03. mobile menu Js
    let tpMenuhtml = $('.tp-mobile-menu-active > ul').clone();
    let tpOffcanvasMenu = $('.tp-offcanvas-menu > nav');

    tpOffcanvasMenu.append(tpMenuhtml);

    if($(tpOffcanvasMenu).find('.sub-menu').length != 0){
      $(tpOffcanvasMenu).find('.sub-menu').parent().append('<button class="tp-sidemenu-close"><i class="fas fa-chevron-right"></i></button>');
    }
    
    let tpSideMenuToggle = $('button.tp-sidemenu-close');

    $(tpSideMenuToggle).on('click',function(){
        $(this).siblings('.sub-menu').slideToggle();
        $(this).parent().toggleClass('active');
    });

	///////////////////////////////////////////////////
	// 04. Sticky Header Js
	windowOn.on('scroll', function () {
		var scroll = windowOn.scrollTop();
		if (scroll < 400) {
			$("#header-sticky").removeClass("header-sticky");
		} else {
			$("#header-sticky").addClass("header-sticky");
		}
	});
	if ($('.tp-header-height').length > 0) {
		var headerHeight = document.querySelector(".tp-header-height");
		var setHeaderHeight = headerHeight.offsetHeight;
		$(".tp-header-height").each(function () {
			$(this).css({
				'height' : $(this).height()
			});
		});
	}


	////////////////////////////////////////////////////
	// 05. offcanvas

	$(".tp-header-toogle").on('click',function(){
        $(".tp-offcanvas").addClass("tp-offcanvas-open");
        $(".tp-offcanvas-overlay").addClass("tp-offcanvas-overlay-open");
    });

    $(".tp-offcanvas-close-button,.tp-offcanvas-overlay").on('click',function(){
        $(".tp-offcanvas").removeClass("tp-offcanvas-open");
        $(".tp-offcanvas-overlay").removeClass("tp-offcanvas-overlay-open");
    });

	////////////////////////////////////////////////////
	// 06. filter
	$(".filter-open-btn").on("click", function () {
		$(".tp-filter-offcanvas-area").addClass("offcanvas-opened");
		$(".tp-offcanvas-overlay").addClass("tp-offcanvas-overlay-open");
	});

	$(".filter-close-btn,.tp-offcanvas-overlay").on("click", function () {
		$(".tp-filter-offcanvas-area").removeClass("offcanvas-opened");
		$(".tp-offcanvas-overlay").removeClass("tp-offcanvas-overlay-open");
	});

	$(".filter-open-dropdown-btn").on("click", function () {
		$(".tp-filter-dropdown-area").toggleClass('filter-dropdown-opened');
	});

	$(".cartmini-open-btn").on("click", function () {
		$(".cartmini__area").addClass("cartmini-opened");
		$(".tp-offcanvas-overlay").addClass("tp-offcanvas-overlay-open");
	});
  
	$(".cartmini-close-btn,.tp-offcanvas-overlay").on("click", function () {
		$(".cartmini__area").removeClass("tp-offcanvas-overlay-open cartmini-opened");
		$(".tp-offcanvas-overlay").removeClass("tp-offcanvas-overlay-open");
	});

	////////////////////////////////////////////////////
	// 07. Common Js
	$("[data-background").each(function () {
		$(this).css("background-image", "url( " + $(this).attr("data-background") + "  )");
	});

	$("[data-width]").each(function () {
		$(this).css("width", $(this).attr("data-width"));
	});

	$("[data-bg-color]").each(function () {
		$(this).css("background-color", $(this).attr("data-bg-color"));
	});


	////////////////////////////////////////////////////
	// 08. back-to-top
	function back_to_top() {
		var btn = $('#back_to_top');
		var btn_wrapper = $('.back-to-top-wrapper');

		windowOn.scroll(function () {
			if (windowOn.scrollTop() > 300) {
				btn_wrapper.addClass('back-to-top-btn-show');
			} else {
				btn_wrapper.removeClass('back-to-top-btn-show');
			}
		});

		btn.on('click', function (e) {
			e.preventDefault();
			$('html, body').animate({ scrollTop: 0 }, '300');
		});
	}
	back_to_top();

	////////////////////////////////////////////////////
	// 9. magnificPopup img view
	$('.popup-image').magnificPopup({
		type: 'image',
		gallery: {
			enabled: true
		}
	});

	$(".popup-video").magnificPopup({
		type: "iframe",
	});

	////////////////////////////////////////////////////
	// 10. Counter Js
	new PureCounter();
	new PureCounter({
		filesizing: true,
		selector: ".filesizecount",
		pulse: 2,
	});

	////////////////////////////////////////////////////
	// 11. tp-booking-toggle
	$('.tp-booking-toggle').on('click', function (e) {
		e.stopPropagation(); // Prevent event from bubbling up to document click handler
		let toggle = $(this); // Scope toggle to this click event
		let container = toggle.parent('.tp-booking-nohide');

		// Toggle active class and dropdown visibility for this specific element
		if (toggle.hasClass('active')) {
			toggle.removeClass('active');
			toggle.next('.tp-booking-toggle-active').removeClass('booking-open');
		} else {
			$('.tp-booking-toggle').removeClass('active');
			$('.tp-booking-toggle-active').removeClass('booking-open');
			toggle.addClass('active');
			toggle.next('.tp-booking-toggle-active').addClass('booking-open');
		}
	});

	$(document).on('click', function (e) {
		if (!$(e.target).closest('.tp-booking-nohide').length) {
			$('.tp-booking-toggle').removeClass('active');
			$('.tp-booking-toggle-active').removeClass('booking-open');
		}
	});

	////////////////////////////////////////////////////
	// 12. tp-multi-datepicker
	if ($(".tp-multi-datepicker").length) {
		$(".tp-multi-datepicker").each(function () {
			let self = $(this);
			self.daterangepicker({
				autoUpdateInput: false,
				minDate: moment()
			});
			self.on("apply.daterangepicker", function (ev, picker) {
				$(this).val(
				picker.startDate.format("D MMM YY") +
				" - " +
				picker.endDate.format("D MMM YY")
				);
			});
		});
	}

	//  tp-single-datepicker
	if ($(".tp-single-datepicker").length) {
		$(".tp-single-datepicker").each(function () {
			var $this = $(this);
			$this.daterangepicker({
				singleDatePicker: true,   // single date mode
				autoUpdateInput: false,
				minDate: moment(),
				locale: {
					format: "D MMM YY"
				}
			});
			$this.on("apply.daterangepicker", function (ev, picker) {
				$(this).val(picker.startDate.format("D MMM YY"));
			});
		});
	}

	///////////////////////////////////////////////////
	// 13. E-commerce plus minus js
	function tp_ecommerce() {
		$('.tp-dreckment,.tp-cart-minus').on('click', function () {
		  const $input = $(this).siblings('input');
		  let count = Number($input.val()) - 1;
		  $input.val(count < 1 ? 0 : count).change();
		});
	  
		$('.tp-increment,.tp-cart-plus').on('click', function () {
		  const $input = $(this).siblings('input');
		  $input.val(Number($input.val()) + 1).change();
		});

		$('.tp-color-variation-btn').on('click', function () {
		  $(this).addClass('active').siblings().removeClass('active');
		});

		//  tpReturnCustomerLoginForm //
		$('.tp-checkout-login-form-reveal-btn').on('click', function () {
			$('#tpReturnCustomerLoginForm').slideToggle(400);
		});
		
		//  Show Coupon Toggle Js //
		$('.tp-checkout-coupon-form-reveal-btn').on('click', function () {
		$('#tpCheckoutCouponForm').slideToggle(400);
		});
	
		// Create An Account Toggle Js //
		$('#cbox').on('click', function () {
			$('#cbox_info').slideToggle(900);
		});
	
		// Shipping Box Toggle Js //
		$('#ship-box').on('click', function () {
			$('#ship-box-info').slideToggle(1000);
		});

	}
	tp_ecommerce();
	
	// tp-checkout-payment-item
	$('.tp-checkout-payment-item label').on('click', function () {
		$(this).siblings('.tp-checkout-payment-desc').slideToggle(400);
	});

	///////////////////////////////////////////////////
	// 14. tp-booking-location-input
	if ($('#lineMarker').length) {
		function tp_tab_bg() {
			const $marker = $('#lineMarker');
			const $items  = $('.tp-booking-location-input');
			const $wrap   = $('.tp-marker-tab');

			function moveMarker($el) {
				const left  = ($el.offset().left - $wrap.offset().left) - 7;
				const width = $el.outerWidth() + 7;

				$marker.css({
					left: left + 'px',
					width: width + 'px',
					display: 'block'
				});
			}

			// initial active
			const $active = $items.filter('.active');
			if ($active.length) {
				moveMarker($active);
			}

			// click (ThemeForest standard)
			$items.on('click', function () {
				$items.removeClass('active');
				$(this).addClass('active');
				moveMarker($(this));
			});
		}
		tp_tab_bg();
	}

	///////////////////////////////////////////////////
	// 15. tp-filter-collapse
	$(".tp-filter-collapse").on("click", function () {
        var _parent = $(this).parents(".tp-filter-item");
        if (_parent.find(".box-collapse").css("display") == "none") {
            $(this).removeClass("collapsed-item");
            _parent.find(".box-collapse").slideDown();
        } else {
            $(this).addClass("collapsed-item");
            _parent.find(".box-collapse").slideUp();
        }
    });

	///////////////////////////////////////////////////
	// 16. item load more

	if ($('.load-more-content-3').length > 0) {
		$('.load-more-content-3').btnLoadmore2({
			showItem : 4,
			whenClickBtn : 2,
			textBtn : 'Show all reviews',
			classBtn : 'tp-filter-showmore-3 tp-btn text-decoration-none text-white'
		});
	}

	if ($('.read-more-wrapper').length > 0) {
		$('.read-more-wrapper').each(function () {
			var $wrapper = $(this);
			var $text = $wrapper.find('.load-more-content');
			var $btn = $wrapper.find('.toggle-btn');
			var collapsedHeight = 190;
			if ($text[0].scrollHeight <= collapsedHeight) {
				$btn.hide();
			}
			$text.css({
				height: collapsedHeight,
				overflow: 'hidden'
			});
			$btn.on('click', function () {
				if ($text.hasClass('active')) {
					$text.removeClass('active').css('height', collapsedHeight);
					$btn.text('Read More..');
				} else {
					$text.addClass('active').css('height', $text[0].scrollHeight);
					$btn.text('Read Less');
				}
			});
		});
	}

	///////////////////////////////////////////////////
	// 17. showlogin
	$('#showlogin').on('click', function () {
		$('#checkout-login').slideToggle(900);
	});


	///////////////////////////////////////////////////
	// 18. time-picker
	$('.time-picker').daterangepicker({
		singleDatePicker: true,
		timePicker: true,
		timePicker24Hour: true,
		timePickerSeconds: false,
		autoUpdateInput: false,
		locale: {
			format: 'HH:mm'
		}
	});
	$('.time-picker').on('show.daterangepicker', function (ev, picker) {
		picker.container.addClass('only-time-picker');
	});

	$('.time-picker').on('apply.daterangepicker', function (ev, picker) {
		$(this).val(picker.startDate.format('HH:mm'));
	});

 	/////////////////////////////////////////////////////
  	// 19. tp-header-top-lang-toggle

	if ($("#tp-header-top-lang-toggle").length) {
		windowOn.on('click', function (e) {
			if ($("#tp-header-top-lang-toggle").has(e.target).length || $("#tp-header-top-lang-toggle")[0] === e.target) {
				$(".tp-header-top-lang ul").toggleClass("tp-header-top-list-open");
			} else {
				$(".tp-header-top-lang ul").removeClass("tp-header-top-list-open");
			}
		});
	}

 	/////////////////////////////////////////////////////
  	// 20. tp-header-top-currency-toggle
	if ($("#tp-header-top-currency-toggle").length) {
		windowOn.on('click', function (e) {
			if ($("#tp-header-top-currency-toggle").has(e.target).length || $("#tp-header-top-currency-toggle")[0] === e.target) {
				$(".tp-header-top-currency ul").toggleClass("tp-header-top-currency-list-open");
			} else {
				$(".tp-header-top-currency ul").removeClass("tp-header-top-currency-list-open");
			}
		});
	}

	///////////////////////////////////////////////////
	// 21. tp-about-col-custom
	$('.tp-about-col-custom').on('mouseenter', function () {
		$(this).addClass('active').siblings().removeClass('active');
	})

	///////////////////////////////////////////////////
	// 22. typed-text
	windowOn.on('load', function () {
		if ($('.typed-text').length && $('.typed-strings').length) {
			new Typed('.typed-text', {
				stringsElement: '.typed-strings',
				typeSpeed: 100,
				backSpeed: 40,
				loop: true
			});
		}
	});

 	/////////////////////////////////////////////////////
  	// 23. tp-header-top-lang-toggle
	if ($("#tp-header-login-btn").length) {
		windowOn.on('click', function (e) {
			if ($("#tp-header-login-btn").has(e.target).length || $("#tp-header-login-btn")[0] === e.target) {
				$(".tp-header-login ul").toggleClass("tp-header-top-list-open");
			} else {
				$(".tp-header-login ul").removeClass("tp-header-top-list-open");
			}
		});
	}

	////////////////////////////////////////////////////
	// 24. Wow Js

    function wowAnimation() {
        var wow = new WOW({
            boxClass: 'wow',
            animateClass: 'animated',
            offset: 0,
            mobile: false,
            live: true
        });
        wow.init();
    }

	////////////////////////////////////////////////////
	// 25. tp file upload drag effect
	if ($(".tp-upload-box").length) {
		$(".tp-upload-box").on("dragover", function () {
			$(this).addClass("drag-over");
		});

		$(".tp-upload-box").on("dragleave drop", function () {
			$(this).removeClass("drag-over");
		});
	}

	////////////////////////////////////////////////////
	// 26. Password Toggle Js 
	if ($('#password-show-toggle').length > 0) {
		var btn = document.getElementById('password-show-toggle');
		btn.addEventListener('click', function (e) {
			var inputType = document.getElementById('tp_password');
			var openEye = document.getElementById('open-eye');
			var closeEye = document.getElementById('close-eye');

			if (inputType.type === "password") {
				inputType.type = "text";
				openEye.style.display = 'block';
				closeEye.style.display = 'none';
			} else {
				inputType.type = "password";
				openEye.style.display = 'none';
				closeEye.style.display = 'block';
			}
		});
	}


})(jQuery);
