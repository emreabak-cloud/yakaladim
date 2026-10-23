
/* Button Load more - v1.0.0 - 2018-02-28
* Copyright (c) 2018 NTTPS; */

(function ($) {
    $.fn.btnLoadmore = function (options) {
        var defaults = {
                showItem: 6,
                whenClickBtn: 3,
                textBtn: 'Loadmore ...',
                classBtn : '',
                setCookies: false,
                delayToScroll: 1000,

            },
            options = $.extend(defaults, options);

        this.each(function () {

            var $this = $(this),
                $childrenClass = $($this.children());

            // Get Element Of contents to hide
            $childrenClass.hide();

            //Show Element from Options
            $childrenClass.slice(0, defaults.showItem).show();
            
            //Show Button when item in contents != 0
            if ($childrenClass.filter(":hidden").length > 0) {
                $this.after('<button type="button" class="btn-loadmore '+ defaults.classBtn +'">' + defaults.textBtn + '</button>')
            }

            $(document).on('click', '.btn-loadmore', function (e) {
                e.preventDefault();
                $childrenClass.filter(':hidden').slice(0, defaults.whenClickBtn).slideDown();
                if ($childrenClass.filter(":hidden").length == 0) {
                    $(".btn-loadmore").fadeOut(100);
                    $(".btn-loadmore-text").fadeIn(300);
                }
            });
        });
    }
}(jQuery));

(function ($) {
    $.fn.btnLoadmore2 = function (options) {
        var defaults = {
                showItem: 6,
                whenClickBtn: 3,
                textBtn: 'Loadmore ...',
                classBtn : '',
                setCookies: false,
                delayToScroll: 1000,

            },
            options = $.extend(defaults, options);

        this.each(function () {

            var $this = $(this),
                $childrenClass = $($this.children());

            // Get Element Of contents to hide
            $childrenClass.hide();

            //Show Element from Options
            $childrenClass.slice(0, defaults.showItem).show();
            
            //Show Button when item in contents != 0
            if ($childrenClass.filter(":hidden").length > 0) {
                $this.after('<button type="button" class="btn-loadmore-2 '+ defaults.classBtn +'">' + defaults.textBtn + '</button>')
            }

            $(document).on('click', '.btn-loadmore-2', function (e) {
                e.preventDefault();
                $childrenClass.filter(':hidden').slice(0, defaults.whenClickBtn).slideDown();
                if ($childrenClass.filter(":hidden").length == 0) {
                    $(".btn-loadmore-2").fadeOut(400);
                    $(".btn-loadmore-text").fadeIn(700);
                }
            });
        });
    }
}(jQuery));