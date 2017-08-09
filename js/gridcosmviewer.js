var GRIDCOSMVIEWER = function(){
	// Set up parameters
	var config = {
		depth: 3,
		imageBaseUrl: "https://www.sito.org/synergy/gridcosm/pieces/",
		velocityDef: 1.02,
		topmostLevel: 4204,
		displayRatioWidth: (9 / 16) // set to 1 to be square
	}, anim = {
		isPlaying: false,
		velocity: config.velocityDef,
		delay: 1000,
		direction: -1,
		fps: 24,
		rotation: 0
	}, state = {
		animTimeout: null,
		isIos: false,
		vizLevel: null,
		topLevel: null
	};

	var init = function(io) {
		config = Object.assign({},config, io);

		// On load
		$(function(){
			if (navigator.userAgent.match(/(iPod|iPhone|iPad)/i)) { // is iphone?
				state.isIos = true;
			}

			initUi();
			initDom();

			// interpret URL hash
			var param = document.URL.split('#')[1];
			param = parseInt(param);
			param = (param >= 0) ? param : 2170; // default level to show
			populateViewport(param+1);
			 $('.l0').data('rot',0);
			moveToNextLevel(-1);

			state.vizLevel = state.topLevel;
			updateHud();
		});
	};

	var initUi = function() {
		// toggle plays
		$("#zoom_in").click(function(){
			togglePlaying(-1);
		});
		$("#zoom_out").click(function(){
			togglePlaying(1);
		});
		
		// level input
		$("#levelinput input").change(function(){
			stopPlaying();
			var lvl = parseInt($(this).val());
			goToLevel(lvl);
		});

		// snap tos
		$("#snap_in").click(function(){
			moveToNextLevel(-1);
		});
		$("#snap_out").click(function(){
			moveToNextLevel(1);
		});

		// clicks on viewport
		$("#viewport").click(function(e){
			// measure mid square's dims
			var vpw = $("#viewport").width();
			var vph = $("#viewport").height();
			var midmin_x = vpw * 0.33333;
			var midmax_x = vpw * 0.66666;
			var midmin_y = vph * 0.33333;
			var midmax_y = vph * 0.66666;

			// get click position
			var opos = $(this).offset(),
				elposX = opos.left,
				elposY = opos.top,
				posx = (e.pageX - elposX),
				posy = (e.pageY - elposY);

			if ((posx >= midmin_x && posx <= midmax_x) && (posy > midmin_y && posy <= midmax_y)) {
				moveToNextLevel(-1); // zoom in
			} else {
				moveToNextLevel(1);
			}
		});

		$(document).keydown(function(event){
			if (event.which == 38) { // up arrow
				moveToNextLevel(1);
				event.preventDefault();
			} else if (event.which == 40) { // down arrow
				moveToNextLevel(-1);
				event.preventDefault();
			} else if (event.which == 39) { // right arrow
				togglePlaying(1);
				event.preventDefault();
			} else if (event.which == 37) { // left arrow
				togglePlaying(-1);
				event.preventDefault();
			} else if (event.which == 82) { // 'r'
				anim.rotation += .25;
				rotateGrid(anim.rotation);
			} else if (event.which == 69) { // 'e'
				anim.rotation -= .25;
				rotateGrid(anim.rotation);
			} else if (event.which == 107 || event.which == 80) { // '+'
				config.velocityDef = Math.min(1.25, config.velocityDef + .005);
			} else if (event.which == 109 || event.which == 79) { // '-'
				config.velocityDef = Math.max(1.0001,config.velocityDef - .005);
			}
		});
	};

	// controls wrappers
	function togglePlaying(dir) {
		if (dir == anim.direction) {
			anim.isPlaying = !anim.isPlaying; // switch to reverse
		} else {
			anim.isPlaying = true;
			anim.direction = dir;
		}
		if (anim.isPlaying) {
			startPlaying();
		} else {
			stopPlaying();
		}
		updateControlButtonStates();
	};

	function stopPlaying() {
		if (state.animTimeout) {
			clearTimeout(state.animTimeout);
		}
		anim.isPlaying = false;
		if (state.isIos) {
			$('.lvl').css('visibility','visible'); // iphone jaggy concession
		}
		updateControlButtonStates();
	};

	function startPlaying() {
		if (state.animTimeout) {
			clearTimeout(state.animTimeout);
		}
		
		if (state.isIos) {
			// hiding jaggies for iphone
			$('.lvl').css('visibility','hidden');
			$('.lvl.l0').css('visibility','visible');
		}
		startZoom();
	};

	function moveToNextLevel(dir) {
		stopPlaying();
		if (state.targetlevel) { // if already targeting, just add to it
			state.targetlevel += dir; 
		} else {
			state.targetlevel = state.vizLevel + dir;
		}
		anim.direction = dir;
		startPlaying();
	};

	function goToLevel(lvl) {
		stopPlaying();
		// TODO: some code to animate them, but for now just teleport
		populateViewport(lvl);
		updateLink(lvl);
	};

	//helpers
	function updateControlButtonStates() {
		if (anim.isPlaying == false) {
			$('#controls>div').removeClass("playing");
		} else {
			if (anim.direction < 0) {
				$('#zoom_in').addClass("playing");
				$('#zoom_out').removeClass("playing");
			} else {
				$('#zoom_out').addClass("playing");
				$('#zoom_in').removeClass("playing");
			}
		}
	};

	// set up the divs for showing levels
	function initDom() {
		// resize viewport to be square
		var vpw = $('#viewport').width();
		$('#viewport').height(vpw*config.displayRatioWidth);

		// clear whatever's there
		$('#viewport').empty();
		
		// create [n] nested level divs
		var lastdiv = $('#viewport');
		for (var i=0;i<config.depth;i++) {
			var newdiv = $('<div class="lvl"/>');
			$(newdiv).addClass('l'+i);
			$(lastdiv).append($(newdiv));
			lastdiv = newdiv;
		}
	};

	function populateViewport(topLevel) {
		state.topLevel = topLevel;
		state.vizLevel = topLevel;
		for (var i=0; i<config.depth; i++) {
			var level = topLevel - i;
			var file = getZeroedFilename(level);
			var fileurl = 'url("' + config.imageBaseUrl + file + '")';
			var elementclass = '.l' + i;
			$(elementclass).css('background-image',fileurl);
		}
		
		// pre-cache images on top
		var img = new Image();
		img.src = config.imageBaseUrl + getZeroedFilename(topLevel + 1);
	};

	function getZeroedFilename(level) {
		var file = level + "-f.jpg";
		if (level < 10) {
			file = "00"+file;
		} else if (level < 100) {
			file = "0" + file;
		}
		return file;
	};

	/* do one tick of zooming
	*/
	function zoomTick() {
		if (anim.isPlaying == false) {
			return; // stop!
		}
		
		// don't even try to zoom in at 1
		if (state.vizLevel < 1 && anim.direction < 1) {
			stopPlaying();
			updateHud();
			return;
		}
		
		var speed = anim.direction * anim.velocity;
		// check against thresholds...
		var vpsize = $("#viewport").width();
		var vpsize_h = $("#viewport").height();
		var lowerthresh = vpsize;
		var upperthresh = vpsize / (config.depth - 1);
		var w = $('.l0').width();
		var wnew = Math.floor(w * anim.velocity);
		
		var overflowfactor = 3;
		var overflowfraction = 1 / overflowfactor;
		
		if (wnew > vpsize*overflowfactor) {
			shiftLevels(anim.direction);
			wnew *= overflowfraction;
			state.vizLevel = state.topLevel;
		} else if (wnew < vpsize) {
			shiftLevels(anim.direction);
			wnew *= 3;
			state.vizLevel = state.topLevel - 1;
		}
		// stop if at target level now
		var atTarget = (state.targetlevel && (state.vizLevel == state.targetlevel));
		if (atTarget) {
			// now adjust so not showing zoomed in version (when zooming out)
			if (anim.direction > 0) {
				populateViewport(state.topLevel-1);
				wnew = vpsize;
			}
			state.targetlevel = null;
			stopPlaying();
		}
		
		// do the size change
		var negmar = (wnew - vpsize) * -0.5;
		var negmartop = (wnew - vpsize_h) * -0.5;
		$('.l0').css({
			width: wnew + "px",
			height: wnew + "px",
			left: negmar,
			top: negmartop
		});
		
		if (anim.rotation != 0) {
			rotateGrid(anim.rotation);
		}
		
		// if still animating, trigger the timeout again
		if (state.topLevel >= 1 && 
			state.topLevel < config.topmostLevel && 
			anim.isPlaying) {
			state.animTimeout = setTimeout(function(){zoomTick();},anim.delay);
		} else {
			stopPlaying();
		}
		
		// update display
		updateHud();
	};

	/* rotate by amount
	*/
	function rotateGrid(rotAdj) {
		rotAdj = (rotAdj == null) ? 1 : rotAdj;
		var r = $('.l0').data('rot') + rotAdj;
		r = r%360;
		$('.l0').css({
			'-webkit-transform': 'rotate('+r+'deg)',
			'-moz-transform': 'rotate('+r+'deg)',
			'-ms-transform': 'rotate('+r+'deg)',
			'-o-transform': 'rotate('+r+'deg)',
			'transform': 'rotate('+r+'deg)'
		}).data('rot', r);
	};

	/* update the HUD
	*/
	function updateHud() {
		$("#levelinput input").val(state.vizLevel);
		updateLink(state.vizLevel);
		updateControlButtonStates();
	};

	function updateLink(lv) {
		$(".level_link").html("<a href='https://www.sito.org/cgi-bin/gridcosm/gridcosm?level=" + lv + "'>See on Gridcosm</a>");
	};

	/* start the zoom
	*/
	function startZoom() {
		anim.delay = (1000/anim.fps);
		anim.isPlaying = true;
		if (anim.direction < 0) {
			anim.velocity = config.velocityDef;
		} else {
			anim.velocity = 1 - (config.velocityDef - 1);
		}
		zoomTick();
	};

	function shiftLevels(dir) {
		state.topLevel += dir;
		populateViewport(state.topLevel);
	};

	return {
		"init": init
	}
}();
