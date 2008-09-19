// Enhanced Douban Collecting Dialog
// a greasemonkey script offers del.icio.us-style douban subject
// collecting experience
// Version: 0.2
// Copyright (c) 2008 Wu Yuntao <http://luliban.com/blog/>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: http://greasemonkey.mozdev.org/
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name            Enhanced Douban Collecting Dialog 
// @namespace       http://luliban.com/blog/
// @description     a greasemonkey script offers del.icio.us-style douban subject collecting experience
// @include         http://www.douban.com/subject/*
// @include         http://www.douban.com/*/mine?status=*
// @include         http://www.douban.com/people/*/*tags/*
// @include         http://www.douban.com/*/recommended
// @include         http://www.douban.com/*/top250
// @include         http://www.douban.com/*/tag/*
// ==/UserScript==


// check if jquery's loaded
function GM_wait() {
    if (typeof unsafeWindow.jQuery == 'undefined') {
        window.setTimeout(GM_wait, 100);
    } else { 
        window.$ = unsafeWindow.jQuery;

        window.parser = new Parser();
        parser.buttons().click(function() {
            dialog_wait();
        });
    }
}

// check if dialog's loaded
function dialog_wait() {
    var dialog = $('#dialog');
    if (dialog.html() == null || dialog.children().attr('class') == 'loadpop') {
        window.setTimeout(dialog_wait, 100);
    } else {
        // feature functions goes here
        add_delete_button(dialog);
        move_collect_buttons(dialog);
        // load douban api initially
        if (typeof unsafeWindow.DOUBAN == 'undefined') {
            $.getScript('/js/api.js?v=2', function() {
                $.getScript('/js/api-parser.js?v=1', function() {
                    window.DOUBAN = unsafeWindow.DOUBAN;
                    DOUBAN.apikey = '9e339c9d951cdb9cda9ad5d8bf5692d4';
                    new TagSuggest(dialog);
                });
            });
        } else {
            new TagSuggest(dialog);
        }
    }
}


// Douban Page Parser which may change frequently
function Parser() {
    // initialize parameters necessary
    this._collecting_buttons = null;
    this._collecting_description = null;
    this._collecting_interest = null;
    this._subject_category = null;
    this._subject_id = null;
    this._user_id = null;

    this.category_dict = {
        'C': 'book',
        'M': 'movie',
        'W': 'music'
    };

    this.parse_user_id();
};

(function(Parser) {
    // get collecting buttons those classname is a_collect_btn
    Parser.prototype.buttons = function() {
        if (this._collecting_buttons == null) {
            this._collecting_buttons = $('a.a_collect_btn');
        }
        return this._collecting_buttons;
    };

    // get category
    Parser.prototype.category = function() {
        if (this._subject_category == null) {

            // parse category from window.location.href where urls match:
            // '^/(movie|book/music)/mine?status=(wish|collect|do)',
            // '^/(movie|book/music)/(recommended|top250|(tag/.*))',
            // '^/people/.*/(movie|book/music)tags/.*',
            var cate = window.location.href.match(/(book|movie|music)/);
            if (cate != null) {
                this._subject_category = cate[1];
            } 

            // parse category from name of recommand button where urls match:
            // '^/subject/.*',
            else if ($('.a_rec_btn').html() != null) {
                // a quick solution to get category code via name of recommand button;
                // like 'rbtn-M-2078864-'
                var code = $('.a_rec_btn').attr('name').split('-')[1];
                this._subject_category = this.category_dict[code];
            }
            
            // if category not parsed, raise an exception
            else {
                throw('NotFindCategoryError');
                alert('I can not find category of the subject which you are going to collect.');
            }

        }
        return this._subject_category;
    };

    // get description
    Parser.prototype.description = function(dialog) {
        // a quick solution to get description from title string of the dialog
        // like '我最近在读这本书   · · · · · · '
        var desc = dialog.find('h2').text().match(/^我(.*)\ (.*)/);
        return this._collecting_description = (desc == null) ? '' : desc[1];
    };

    // get interest
    Parser.prototype.interest = function(dialog) {
        return this._collecting_interest = dialog.find('input[@name="interest"]').val();
    };

    // get subject id
    Parser.prototype.subject_id = function(dialog) {
        // a quick solution to get subject_id via form action of the dialog
        // like '/j/subject/3011224/interest'
        var sid = dialog.find('form').attr('action').split('/')[3];
        return this._subject_id = sid;
    };

    // get user id
    Parser.prototype.user_id = function() {
        return this._user_id;
    };

    Parser.prototype.parse_user_id = function() {
        // solve the scope problem
        var instance = this;
        // access a subject page to get the user's id
        $.get('/subject/3024234/', function(data) {
            instance._user_id = 
                data.match(/href=\"\/people\/(\w+)\/recs\?add=W(\d+)\"\ class=\"j\ a_rec_btn/)[1];
        });
    }
})(Parser);


// add a deleted collect button
function add_delete_button(dialog) {
    var c_interest = parser.interest(dialog);
    if (c_interest) {
        dialog.find('tr#submits span.rr')
              .prepend('<input type="submit" name="delete" class="delete_collect_btn" value="删除"></input>');
        $('.delete_collect_btn').click(function() {
            delete_collection(parser.category(), c_interest, parser.subject_id(dialog));
            return false;
        });
    }
}

// delect collections via getting url like "/movie/mine?decollect=3011225" and reload page
function delete_collection(category, interest, id) {
    var action_dict = {
        'do': 'undo',
        'collect': 'decollect',
        'wish': 'unwish'
    };
    var url = '/' + category + '/mine?' + action_dict[interest] + '=' + id;
    $.get(url, function() {
        window.location.reload();
    });
}


// re-arrange button positions
function move_collect_buttons(dialog) {
    var submits = dialog.find('tr#submits');
    var left_submits = submits.find('span.ll');
    var right_submits = submits.find('span.rr');

    var interest_list = ["collect", "do", "wish"];
    var c_interest = parser.interest(dialog);
    var collect_button, do_button, wish_button;

    $.each(interest_list, function() {
        var button = this + '_button';
        if (c_interest == this) {
            // if is current interest, get and modify the save button
            eval(this + '_button = left_submits.children(\'input[@name="save"]\')');
            eval(this + '_button.val(parser.description(dialog)).css("font-weight", "bold");');
        } else {
            eval(this + '_button = right_submits.children(\'input[@name="' + this + '"]\')');
        }
    });

    // move all buttons to left submits area
    collect_button.appendTo(left_submits)
    // ordering from left to right: collect, do, wish
                  .after(wish_button).after("&nbsp;&nbsp;").after(do_button).after("&nbsp;&nbsp;");
}

// add tag suggestion
function TagSuggest(dialog) {
    var tag_list = new Array();
    var done = false;

    // start fetching
    tag_fetch(1);
    tag_wait();
    tag_style();

    // fetch tags using douban api
    function tag_fetch(index) {
        var method_dict = {
            "book": DOUBAN.getUserBookTags,
            "movie": DOUBAN.getUserMovieTags,
            "music": DOUBAN.getUserMusicTags
        };

        var params = {
            id: parser.user_id(),
            startindex: index,
            maxresults: 50,
            callback: tag_parse
        };
        method_dict[parser.category()](params);
    }

    // parse titles of tags
    function tag_parse(result) {
        var tags = DOUBAN.parseTags(result);
        $.each(tags.entries, function() {
            tag_list.push(this.title);
        });
        if ((tags.startIndex + 49) < tags.totalResults) {
            tag_fetch(tags.startIndex + 50);
        } else {
            done = true;
        }
    }

    // add tag style
    function tag_style() {
        if ($('style#tag-style').html() == null) {
            var style = 'ul.tag-matches { position: fixed; width: 180px; border-left: 1px solid #eeffee; border-right: 1px solid #eeffee; background: #ffffff; } '
                      + 'ul.tag-matches li { padding: 2px 5px; color: #060; border-bottom: 1px solid #eeffee; } '
                      + 'ul.tag-matches li:hover { background: #eeffee; cursor: pointer; } '
            $('head').append('<style type="text/css" id="tag-style">' + style + '</style>');
        }
    }

    // check if tags are ready
    function tag_wait() {
        if (!done) {
            window.setTimeout(tag_wait, 100);
        } else {
            dialog.find('input[@name="tags"]').tagSuggest({
                tags: tag_list,
                matchClass: 'tag-matches',
                tagContainer : 'ul', 
                tagWrap : 'li', 
                delay : 1.0
            });
        }
    }

}


// Script entry
GM_wait();


// ==================================================
// jQuery plugin: tag-suggest
// ==================================================
/*
  @author: remy sharp / http://remysharp.com
  @url: http://remysharp.com/2007/12/28/jquery-tag-suggestion/
  @usage: setGlobalTags(['javascript', 'jquery', 'java', 'json']); 
          // applied tags to be used for all implementations
          $('input.tags').tagSuggest(options);
          
          The selector is the element that the user enters their tag list
  @params:
    matchClass - class applied to the suggestions, defaults to 'tagMatches'
    tagContainer - the type of element uses to contain the suggestions, defaults to 'span'
    tagWrap - the type of element the suggestions a wrapped in, defaults to 'span'
    sort - boolean to force the sorted order of suggestions, defaults to false
    url - optional url to get suggestions if setGlobalTags isn't used.  Must return array of suggested tags
    tags - optional array of tags specific to this instance of element matches
    delay - optional sets the delay between keyup and the request - can help throttle ajax requests, defaults to zero delay
    separator - optional separator string, defaults to ' ' (Brian J. Cardiff)
  @license: Creative Commons License - ShareAlike http://creativecommons.org/licenses/by-sa/3.0/
  @version: 1.4
  @changes: fixed filtering to ajax hits
*/

(function ($) {
    var globalTags = [];

    // creates a public function within our private code.
    // tags can either be an array of strings OR
    // array of objects containing a 'tag' attribute
    window.setGlobalTags = function(tags /* array */) {
        globalTags = getTags(tags);
    };
    
    function getTags(tags) {
        var tag, i, goodTags = [];
        for (i = 0; i < tags.length; i++) {
            tag = tags[i];
            if (typeof tags[i] == 'object') {
                tag = tags[i].tag;
            } 
            goodTags.push(tag.toLowerCase());
        }
        
        return goodTags;
    }
    
    $.fn.tagSuggest = function (options) {
        var defaults = { 
            'matchClass' : 'tagMatches', 
            'tagContainer' : 'span', 
            'tagWrap' : 'span', 
            'sort' : true,
            'tags' : null,
            'url' : null,
            'delay' : 0,
            'separator' : ' '
        };

        var i, tag, userTags = [], settings = $.extend({}, defaults, options);

        if (settings.tags) {
            userTags = getTags(settings.tags);
        } else {
            userTags = globalTags;
        }

        return this.each(function () {
            var tagsElm = $(this);
            var elm = this;
            var matches, fromTab = false;
            var suggestionsShow = false;
            var workingTags = [];
            var currentTag = {"position": 0, tag: ""};
            var tagMatches = document.createElement(settings.tagContainer);
            
            function showSuggestionsDelayed(el, key) {
                if (settings.delay) {
                    if (elm.timer) clearTimeout(elm.timer);
                    elm.timer = setTimeout(function () {
                        showSuggestions(el, key);
                    }, settings.delay);
                } else {
                    showSuggestions(el, key);
                }
            }

            function showSuggestions(el, key) {
                workingTags = el.value.split(settings.separator);
                matches = [];
                var i, html = '', chosenTags = {}, tagSelected = false;

                // we're looking to complete the tag on currentTag.position (to start with)
                currentTag = { position: currentTags.length-1, tag: '' };
                
                for (i = 0; i < currentTags.length && i < workingTags.length; i++) {
                    if (!tagSelected && 
                        currentTags[i].toLowerCase() != workingTags[i].toLowerCase()) {
                        currentTag = { position: i, tag: workingTags[i].toLowerCase() };
                        tagSelected = true;
                    }
                    // lookup for filtering out chosen tags
                    chosenTags[currentTags[i].toLowerCase()] = true;
                }

                if (currentTag.tag) {
                    // collect potential tags
                    if (settings.url) {
                        $.ajax({
                            'url' : settings.url,
                            'dataType' : 'json',
                            'data' : { 'tag' : currentTag.tag },
                            'async' : false, // wait until this is ajax hit is complete before continue
                            'success' : function (m) {
                                matches = m;
                            }
                        });
                    } else {
                        for (i = 0; i < userTags.length; i++) {
                            if (userTags[i].indexOf(currentTag.tag) === 0) {
                                matches.push(userTags[i]);
                            }
                        }                        
                    }
                    
                    matches = $.grep(matches, function (v, i) {
                        return !chosenTags[v.toLowerCase()];
                    });

                    if (settings.sort) {
                        matches = matches.sort();
                    }                    

                    for (i = 0; i < matches.length; i++) {
                        html += '<' + settings.tagWrap + ' class="_tag_suggestion">' + matches[i] + '</' + settings.tagWrap + '>';
                    }

                    tagMatches.html(html);
                    suggestionsShow = !!(matches.length);
                } else {
                    hideSuggestions();
                }
            }

            function hideSuggestions() {
                tagMatches.empty();
                matches = [];
                suggestionsShow = false;
            }

            function setSelection() {
                var v = tagsElm.val();

                // tweak for hintted elements
                // http://remysharp.com/2007/01/25/jquery-tutorial-text-box-hints/
                if (v == tagsElm.attr('title') && tagsElm.is('.hint')) v = '';

                currentTags = v.split(settings.separator);
                hideSuggestions();
            }

            function chooseTag(tag) {
                var i, index;
                for (i = 0; i < currentTags.length; i++) {
                    if (currentTags[i].toLowerCase() != workingTags[i].toLowerCase()) {
                        index = i;
                        break;
                    }
                }

                if (index == workingTags.length - 1) tag = tag + settings.separator;

                workingTags[i] = tag;

                tagsElm.val(workingTags.join(settings.separator));
                tagsElm.blur().focus();
                setSelection();
            }

            function handleKeys(ev) {
                fromTab = false;
                var type = ev.type;
                var resetSelection = false;
                
                switch (ev.keyCode) {
                    case 37: // ignore cases (arrow keys)
                    case 38:
                    case 39:
                    case 40: {
                        hideSuggestions();
                        return true;
                    }
                    case 224:
                    case 17:
                    case 16:
                    case 18: {
                        return true;
                    }

                    case 8: {
                        // delete - hide selections if we're empty
                        if (this.value == '') {
                            hideSuggestions();
                            setSelection();
                            return true;
                        } else {
                            type = 'keyup'; // allow drop through
                            resetSelection = true;
                            showSuggestionsDelayed(this);
                        }
                        break;
                    }

                    case 9: // return and tab
                    case 13: {
                        if (suggestionsShow) {
                            // complete
                            chooseTag(matches[0]);
                            
                            fromTab = true;
                            return false;
                        } else {
                            return true;
                        }
                    }
                    case 27: {
                        hideSuggestions();
                        setSelection();
                        return true;
                    }
                    case 32: {
                        setSelection();
                        return true;
                    }
                }

                if (type == 'keyup') {
                    switch (ev.charCode) {
                        case 9:
                        case 13: {
                            return true;
                        }
                    }

                    if (resetSelection) { 
                        setSelection();
                    }
                    showSuggestionsDelayed(this, ev.charCode);            
                }
            }

            tagsElm.after(tagMatches).keypress(handleKeys).keyup(handleKeys).blur(function () {
                if (fromTab == true || suggestionsShow) { // tweak to support tab selection for Opera & IE
                    fromTab = false;
                    tagsElm.focus();
                }
            });

            // replace with jQuery version
            tagMatches = $(tagMatches).click(function (ev) {
                if (ev.target.nodeName == settings.tagWrap.toUpperCase() && $(ev.target).is('._tag_suggestion')) {
                    chooseTag(ev.target.innerHTML);
                }                
            }).addClass(settings.matchClass);

            // initialise
            setSelection();
        });
    };
})($);
