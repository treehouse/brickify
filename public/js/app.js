(function(){
  // Units in mm
  
  window.BRICK_WIDTH = 8; //mm
  window.BRICK_HEIGHT = 9.6; //mm
  
  window.BRICK_LENGTHS = [1, 2, 3, 4, 6, 8, 10];
  
  window.namedColors = {
    "White":      [255, 255 ,255],
    "Red":        [188,6,2],
    "Blue":       [36,98,175], 
    "Yellow":     [243,194,3], 
    "Dark Gray":  [50,50,50], 
    "Green":      [45,160,85], 
    "Brown":      [176,160,109], 
    "Copper":     [213,127,40], 
    "Light Blue": [116,149,200], 
    "Gray":       [101,101,101],
    "Brown":      [84,42,20], 
    "Light Gray": [146,146,146], 
    "Lime":       [154,186,61], 
    "Navy":       [37,62,102], 
    "Fuschia":    [215,53,156]
  }
  
  window.colorNameLookup = {};
  for(var name in namedColors) colorNameLookup[namedColors[name].toString()] = name;
  
  window.colors = _.values(namedColors)

  
  window.Brickifier = function(canvas){
		var self = this;
    this.$canvas = $(canvas);
    this.canvas  = this.$canvas[0];
    this.ctx     = this.canvas.getContext('2d');

		this.painting = false;
		this.updatedBlocks = {};
		
		this.$canvas.click(function(event) {
			var target = $(event.target);
			var x = event.pageX - target.offset().left;
			var y = event.pageY - target.offset().top;
			
			self.updateBlock(x, y);
		});
		this.$canvas.mousedown(function(event) {
			this.painting = true;
		});
		this.$canvas.mouseup(function(event) {
			this.painting = false;
		});
		this.$canvas.mousemove(function(event) {
			if (this.painting) {
				var target = $(event.target);
				var x = event.pageX - target.offset().left;
				var y = event.pageY - target.offset().top;
			
				self.updateBlock(x, y);
			}
		});
		
    
    
    this.final_width = 1000; //mm
  
    this.getBrickColor = this.getBrickColorAverage;  
    this.getBrickColor = this.getBrickColorNearestNeighbor;
    this.getBrickColor = this.getBrickColorSample5;
    
    this.colorDistance = this.colorDistanceComplex;
    //this.colorDistance = this.colorDistanceBasic;
    //this.colorDistance = this.colorDistanceHSL;

		this.penColor = "White";
  }

  _.extend(Brickifier.prototype, {
    
    /* Load img src, and async trigger this.process() */
    initialize: function(img){
      var self = this;
      this.img = $('<img>').load(function(){        
        setTimeout(function() { self.process() }, 0);
      }).attr('src', img).appendTo('body').hide()[0];
    },
    
    process: function(){
      this.calculateDimensions();
      this.drawImage();
      this.generateColorGrid();
      this.canvas.width = this.canvas.width
      this.drawBlocks();
    },
    
    calculateDimensions: function(){
      var prop = this.img.height / this.img.width;

      // Scale height to fit proportions.
      this.canvas.height = Math.floor(this.canvas.width * prop);
      this.final_height = Math.floor(this.final_width * prop);
      
      // Number of bricks wide, tall 
      this.bricks_x = Math.floor(this.final_width / BRICK_WIDTH);
      this.bricks_y = Math.floor(this.final_height/ BRICK_HEIGHT); 
      
      // Width, Height of 1x1 brick in pixels (at scale)
      this.brick_width = this.canvas.width / this.bricks_x;
      this.brick_height = this.canvas.height / this.bricks_y;
    },
    
		// returns a two element array of x,y
		pixelToBrick: function(xPixel, yPixel) {
			var xRatio = xPixel / this.canvas.width;
			var yRatio = yPixel / this.canvas.height;
			
			xy = []
			xy[0] = Math.floor(xRatio * this.bricks_x);
			xy[1] = Math.floor(yRatio * this.bricks_y);
			
			return xy;
		},

    drawImage: function(){
      this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
    },
    
    getBrickColorAverage: function(x, y){
      var data = this.ctx.getImageData(
        x * this.brick_width,
        y * this.brick_height,
        this.brick_width,
        this.brick_height
      )
      
      var color = [0,0,0], length = data.data.length;
      
      for(var i=0; i < length; i += 4){
        color[0] += data.data[i];
        color[1] += data.data[i+1];
        color[2] += data.data[i+2];
      }
      
      color[0] /= length/4;
      color[1] /= length/4;
      color[2] /= length/4;
          
      return color;
    },
    

    /*
      Determines a block's color using the center pixel
    */
    getBrickColorNearestNeighbor: function(x, y){
      var data = this.ctx.getImageData(
        x * this.brick_width,
        y * this.brick_height,
        this.brick_width,
        this.brick_height
      )
      
      var offset = Math.floor((data.data.length/4) / 2) * 4;
      
      color = [
        data.data[offset],
        data.data[offset + 1],
        data.data[offset + 2]
      ]
        
      return color;
    },
    
    /*
      Determine Brick color using 4 corners + center most common color
    */
    getBrickColorSample5: function(x, y){
      var data = this.ctx.getImageData(
        x * this.brick_width,
        y * this.brick_height,
        this.brick_width,
        this.brick_height
      );
      
      var offsets = [
        0,                                      //first pixel
        Math.max(0, this.bricks_x - 4),                    //last pixel first row
        Math.max(0, data.data.length - 4),                 //last pixel
        Math.max(0, data.data.length - this.bricks_x * 4), //first pixel last row
        Math.floor((data.data.length/4) / 2) * 4        // middle(ish) pixel
      ]
      
      var freq = {}
      
      for(var i=0; i < offsets.length; i++){
        var offset = offsets[i];
        var c = this.nearestColor(Array.prototype.slice.call(data.data ,offset, offset+3)).toString();
        c in freq ? freq[c] += 1 : freq[c]=1;
      }
      
      var key, most, min = 0;
      for(key in freq){
        if(freq[key] > min){
          most = key;
          min = freq[key];
        }
      }
      
      return most.split(',');
    },
    
    /*
      Creates colorGrid based on canvas contents
    */
    generateColorGrid: function(){
      this.colorGrid = []
      
      for(var x=0; x < this.bricks_x; x++ ){
        this.colorGrid[x] = [];
        
        for(var y=0; y < this.bricks_y; y++){
          this.colorGrid[x][y] = this.nearestColor(this.getBrickColor(x, y));
        }
      }
      this.trigger("change:colorGrid");
    },
    
		updateBlock: function(pixelX, pixelY, color) {
			var brickCoordinate = this.pixelToBrick(pixelX, pixelY);
			if (namedColors[this.penColor] != this.colorGrid[brickCoordinate[0]][brickCoordinate[1]]) {
				this.colorGrid[brickCoordinate[0]][brickCoordinate[1]] = namedColors[this.penColor];
				if (this.updatedBlocks[this.penColor] == null) {
					this.updatedBlocks[this.penColor] = [];
				}
				this.updatedBlocks[this.penColor].push([brickCoordinate[0], brickCoordinate[1]]);

				this.drawBlocks();
			}
		},
		
		encodeUpdates: function() {
			return Base64.encode(this.lzw_encode(JSON.stringify(this.updatedBlocks)));
		},
		
		decodeUpdates: function(updates) {
			updates = Base64.decode(updates);
			updates = this.lzw_decode(updates);
			updates = JSON.parse(updates);
			return updates;
		},
		
		applyUpdates: function(updates) {
			console.log("Applying updates", updates);
			this.updatedBlocks = updates;
		},
		
		// LZW-compress a string
		// http://jsolait.net/, LGPL
		lzw_encode: function(s) {
		    var dict = {};
		    var data = (s + "").split("");
		    var out = [];
		    var currChar;
		    var phrase = data[0];
		    var code = 256;
		    for (var i=1; i<data.length; i++) {
		        currChar=data[i];
		        if (dict[phrase + currChar] != null) {
		            phrase += currChar;
		        }
		        else {
		            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
		            dict[phrase + currChar] = code;
		            code++;
		            phrase=currChar;
		        }
		    }
		    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
		    for (var i=0; i<out.length; i++) {
		        out[i] = String.fromCharCode(out[i]);
		    }
		    return out.join("");
			},

			// Decompress an LZW-encoded string
			// http://jsolait.net/, LGPL
			lzw_decode: function(s) {
		    var dict = {};
		    var data = (s + "").split("");
		    var currChar = data[0];
		    var oldPhrase = currChar;
		    var out = [currChar];
		    var code = 256;
		    var phrase;
		    for (var i=1; i<data.length; i++) {
		        var currCode = data[i].charCodeAt(0);
		        if (currCode < 256) {
		            phrase = data[i];
		        }
		        else {
		           phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
		        }
		        out.push(phrase);
		        currChar = phrase.charAt(0);
		        dict[code] = oldPhrase + currChar;
		        code++;
		        oldPhrase = phrase;
		    }
		    return out.join("");
		},

    /*
      Draw 2d blocks to canvas
    */
    drawBlocks: function(){
      var c, style;

			// apply any updates we have, just in case
			self = this;
			if (this.updatedBlocks) {
				_.each(this.updatedBlocks, function(points, color) {
					_.each(points, function(point) {
						self.colorGrid[point[0]][point[1]] = namedColors[color];
					});
				});
			}

			this.canvas.width = this.canvas.width;

      for(var x=0; x < this.bricks_x; x++){
        for(var y=0; y < this.bricks_y; y++){
          c = this.colorGrid[x][y];
          style = "rgb("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+")";

          this.ctx.fillStyle = style;

          this.ctx.fillRect(x*this.brick_width, y*this.brick_height, this.brick_width, this.brick_height);
        }
      }

			this.trigger("redraw");
    },
    
    /*
      Determines the closest pallete color to given color
    */
    nearestColor: function(base){
      var distance = 10000, nearest, d;
      
      for(var i=0; i < colors.length; i++){
        d = this.colorDistance(base, colors[i])
        
        if(d < distance){
          distance = d;
          nearest = i;
        }
      }
      
      return colors[nearest];
    },
    
    /*
      Calculate color distance as sum of differences of rgb channels
    */
    colorDistanceBasic: function(color, base){
      var d = Math.abs(color[0] - base[0])
      d += Math.abs(color[1] - base[1])
      d += Math.abs(color[2] - base[2]) 
      return d
    },
    
    /*
      Calc color distance based on complex color theory stuff
    */
    //http://www.compuphase.com/cmetric.htm
    colorDistanceComplex: function(color, base){
      var r1 = color[0], r2 = base[0],
          g1 = color[1], g2 = base[1],
          b1 = color[2], b2 = base[2],
          r_bar = (r1 + r2)/2,
          dr = r1 - r2,
          dg = g1 - g2,
          db = b1 - b2,
          c, c1, c2, c3;
          
      c1 = (2 + r_bar/256) * Math.pow(dr, 2);
      c2 = 4 * Math.pow(dg, 2);
      c3 = (2 + (255 - r_bar)/256) * Math.pow(db, 2);
      c = Math.sqrt(c1 + c2 + c3);
      
      return c

    },
    
    /*
      Calc color distance based on weighted sums of hsl differences
    */
    colorDistanceHSL: function(color, base){
      var h_weight = 1, 
          s_weight = 1,
          l_weight = 1,
          d = 0;
      
      
      color = rgbToHsl.apply(null, color),
      base = rgbToHsl.apply(null, base);

      d += Math.abs(color[0] - base[0]) * h_weight;
      d += Math.abs(color[1] - base[1]) * s_weight;
      d += Math.abs(color[2] - base[2]) * l_weight;
      
      return d;
    },
    
    pieces: function(){
      var p = {}, p2 = {}
      _.each(this.colorGrid, function(row){
        _.each(row, function(piece){
          if(p[piece.toString()]){
            p[piece.toString()]++
          }else{
            p[piece.toString()] = 1;
          }
        })
      })
      _.each(p, function(value, key){
        p2[colorNameLookup[key]] = value
      })
      return p2
    }
  }, Backbone.Events)


  /*
    Renders isometric view based on a colorGrid
  */
  window.IsoRenderer= function(canvas, sprites, scale, brickifier){
    this.$canvas = $(canvas).hide();
    this.canvas  = this.$canvas[0]
    this.ctx     = this.canvas.getContext('2d');
    this.spriteMap = $('<img>').attr('src', sprites).appendTo('body').hide()[0]; 
    this.scaling = scale;

		this.brickifier = brickifier;
  }
  
  _.extend(IsoRenderer.prototype, {
    
    /*
      Render given colorGrid to self
      If scaling, constrain rendering to canvas width
    */
    render: function(scaling){
      if("undefined" !== typeof scaling){
        this.scaling = scaling;
      } 
			colorGrid = this.brickifier.colorGrid;
      this.colorGrid = this.brickifier.colorGrid;
			
			var yOffset = this.colorGrid.length * 8;
      this.scale();
      
      for(var x = colorGrid.length - 1; x >= 0; x--){
        for(var y=colorGrid[x].length -1; y >= 0; y--){
          var rgb = colorGrid[x][y],
              offset = isoOffset.apply(null, rgb),
              dx = x*18,
							dy = yOffset + y*23 - x*8,
              dw = SPRITE_WIDTH,
              dh = SPRITE_HEIGHT,
              sx = offset,
              sy = 0,
              sw = SPRITE_WIDTH,
              sh = SPRITE_HEIGHT;
          this.ctx.drawImage(this.spriteMap, sx, sy, sw, sh, dx, dy, dw, dh);
        }
      }
      var data = this.canvas.toDataURL("image/png");
      $('#out').attr('src', data);
      
      this.trigger('after-render');
    },
    
    /*
      Scales canvas if scaling is on.
      Also resizes height to rendering proportions
    */
    scale: function(){
      var totalWidth = this.colorGrid.length *18 + 20, // x * 18 + padding
          totalHeight = this.colorGrid.length * 8 + this.colorGrid[0].length * 23 + 20
      
      if(this.scaling){
          var scale = this.canvas.width / totalWidth;
          this.canvas.height = totalHeight * scale
          
          this.ctx.scale(scale, scale);
      }
      else{
        this.canvas.height = totalHeight;
        this.canvas.width = totalWidth;
      }
    }
    
    
  }, Backbone.Events)
  
  // Sprite Dimensions
  var SPRITE_WIDTH = 34,
      SPRITE_HEIGHT = 43;
  
  // Order of sprites in map  
  var spriteOffsets = [
    [255, 255 ,255],
    [188,6,2],
    [36,98,175], 
    [243,194,3], 
    [50,50,50], 
    [45,160,85], 
    [176,160,109], 
    [213,127,40], 
    [116,149,200], 
    [101,101,101],
    [84,42,20], 
    [146,146,146], 
    [154,186,61], 
    [37,62,102], 
    [215,53,156]
  ]

  spriteOffsets = _.map(spriteOffsets, function(rgb){return rgb.toString()})
      
  // Return pixel offset of given rgb value in sprite map
  function isoOffset(r, g, b){
    var str = [r, g, b].toString();
    return spriteOffsets.indexOf(str) * SPRITE_WIDTH;
  }
  _.memoize(isoOffset)
  
  
  
  window.Piece = function(colorName, length){
    this.color = colorName;
    this.length = length;
  }
  
  _.extend(Piece.prototype, {
    toString: function(){
      return this.color + "-" + this.length;
    }
  });
  
  (function(){ // Schematic
    
    var PADDING = 1,
    BUMP_HEIGHT = 3,
    BUMP_WIDTH = 10,
    CELL_WIDTH = 18,
    CELL_HEIGHT = 24,
    ROW_SPREAD = 8;
  
  window.Schematic = function(canvas, brickifier){
    this.$canvas = $(canvas).hide();
    this.canvas  = this.$canvas[0];
    this.ctx     = this.canvas.getContext('2d');
    
    this.brickifier = brickifier;
    this.rows = [];
  }
  
  _.extend(Schematic.prototype, {
    calculate: function(){
      this.colorGrid = this.brickifier.colorGrid;
      var rows = this.colorGrid[0].length,
          cols = this.colorGrid.length,
          r, c;
          
      for(r=0; r < rows; r++){
        var row = [];
        
        for(c=0; c < cols; ){
          var piece = this.getLongestBrick(c, r);
          c+= piece.length;
          row.push(piece);          
        }
        
        this.rows.push(row);
      }
      this.render();
    },
    
    getLongestBrick: function(xStart, y){
      var color = this.colorGrid[xStart][y].toString(), 
          x, i=0, bar=0;
      
      for(x = xStart; x < this.colorGrid.length ;x++){
        if(this.colorGrid[x][y].toString() == color){
          i++;
          if(BRICK_LENGTHS.indexOf(i) >= 0){
            bar = i;
          }
        }else{
          break;
        }
      }
		      return new Piece(colorNameLookup[color], bar);

		    },

		    render: function(){
		      var x=0; y=0, self = this;

		      this.canvas.width = (CELL_WIDTH ) * this.colorGrid.length + PADDING;
		      this.canvas.height = (CELL_HEIGHT + ROW_SPREAD) * (this.colorGrid[0].length)

		      this.ctx.fillStyle = "#CCC"
		      this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);


		      _.each(this.rows, function(row){
		        x=0;

		        _.each(row, function(piece){
		          self.drawPiece(x, y, piece);
		          x+= piece.length;
		        })

		        y++;
		      })

		      $('#schematic_link').attr('href', this.canvas.toDataURL('image/png'));
		    },

		    drawPiece: function(xCell, yCell, piece){
		      var ctx = this.ctx,
		          x = CELL_WIDTH * xCell + PADDING,
		          y = (CELL_HEIGHT + PADDING * ROW_SPREAD) * (yCell ) 

		      ctx.fillStyle = "rgb("+ namedColors[piece.color] +")"

		      ctx.fillRect(
		        x, 
		        y+BUMP_HEIGHT, 
		        piece.length * CELL_WIDTH - (PADDING * 2), 
		        CELL_HEIGHT - BUMP_HEIGHT
		      );

		      for(var i=0; i<piece.length; i++){
		        ctx.fillRect(
		          x + (CELL_WIDTH * i) + (CELL_WIDTH - BUMP_WIDTH)/2 - PADDING,
		          y,
		          BUMP_WIDTH,
		          BUMP_HEIGHT
		        )
		      }
		    }
		  })

		})();// Schemtaic
		  
  /**
	*
	*  Base64 encode / decode
	*  http://www.webtoolkit.info/
	*
	**/
	var Base64 = {

		// private property
		_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

		// public method for encoding
		encode : function (input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;

			input = Base64._utf8_encode(input);

			while (i < input.length) {

				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				output = output +
				this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
				this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

			}

			return output;
		},

		// public method for decoding
		decode : function (input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < input.length) {

				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

			}

			output = Base64._utf8_decode(output);

			return output;

		},

		// private method for UTF-8 encoding
		_utf8_encode : function (string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";

			for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}

			}

			return utftext;
		},

		// private method for UTF-8 decoding
		_utf8_decode : function (utftext) {
			var string = "";
			var i = 0;
			var c = c1 = c2 = 0;

			while ( i < utftext.length ) {

				c = utftext.charCodeAt(i);

				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224)) {
					c2 = utftext.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = utftext.charCodeAt(i+1);
					c3 = utftext.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}

			}

			return string;
		}

	}
})() ;

$(function() {
	var app = $.sammy('#main', function() {
		this.brickifier = new Brickifier("#canvas");
		this.isoRenderer = new IsoRenderer('#iso', '/images/bricks.png', false, this.brickifier);
		this.url = null;
		this.isoDirty = false;
		this.isoRendered = false;
		
		this.showView = function(view) {
			$('.view').hide();
			$(view).show();
		};
		
		this.updateData = function(url, updates) {
			if (this.url != url) {
				this.url = url;
				this.brickifier.initialize('/proxy?url=' + url);
			}
			
			if (updates) {
				updates = this.brickifier.decodeUpdates(updates);
				this.brickifier.applyUpdates(updates);
			}
		}
		
		this.getUrlForAction = function(action) {
			var url = "#/";
			
			if(action) {
				url += action + "/";
			}
			
			if (this.url) {
				url += "?url=" + this.url;
				
				if (this.brickifier.updatedBlocks) {
					url += "&updates=" + encodeURIComponent(this.brickifier.encodeUpdates());
				}
			}
			
			return url;
		}
		
		
		this.get("/", function() {
			this.redirect("#/");
		});
		
		this.get("#/", function() {			
			this.app.url = "";
			this.app.isoDirty = true;
			this.app.isoRendered = false;
			$('#url').val(this.params["url"]);
			this.app.showView("#form");
		});
		
		this.get("#/view/", function() {
			self = this;
			this.app.updateData(encodeURIComponent(this.params["url"]), this.params["updates"]);
			if (this.app.isoDirty == true) {
				this.app.isoRenderer.render();
				s.calculate();
        refreshPieces()
				this.app.isoDirty = false;
			}
			
			this.app.showView("#view");
			$('#edit-link').attr("href", this.app.getUrlForAction("edit"));
		});
		
		this.get("#/edit/", function() {
			this.app.updateData(encodeURIComponent(this.params["url"]), this.params["updates"]);
			this.app.showView("#edit");
			$('#view-link').attr("href", this.app.getUrlForAction("view"));
		});
	});
	
	window.s = new Schematic("#schematic", app.brickifier)
	
	app.brickifier.bind('change:colorGrid', function() {
		app.isoDirty = true;
  });

	app.brickifier.bind('redraw', function() {
		$('#view-link').attr("href", app.getUrlForAction("view"));
		app.isoDirty = true;
		console.log("Marked iso dirty");
		
		if (app.isoRendered == false) {
				setTimeout(function() { app.isoRenderer.render(); }, 0);
				app.isoRendered = true;
		}
  });  
  app.isoRenderer.bind('after-render', function(){
	  refreshPieces(app.brickifier);
	});
	
	
	
	function refreshPieces(brickifier){
	    console.log('refresh')
  	  var pieces = _.flatten(s.rows),
  	      $inv = $('#inventory tbody').empty(),
  	      counts = {};
  	      
  	      
  	      
  	  _.each(pieces, function(p){
  	    var name = p.toString();
  	    counts[name] ? counts[name]++ : counts[name] = 1;
  	  })


  	  _.each(counts, function(qty, key){
  	    console.log(qty, key)
  	    var parts = key.split("-"), length = parts[1], color= parts[0];
  	    $('<tr><td>'+color+'</td><td>1 x '+length+'</td><td>'+qty+'</td></tr>').addClass(key.replace(/ /g, '') + ' set').appendTo($inv);
  	  })


	}
	
	// palette buildout
	var names = _.keys(namedColors);
  for(var i = 0,j = colors.length; i < j; i++) {
    $('#palette').append("<div class=\"color\" data-color=\"" + names[i] + "\"></div>");
    $('#palette div.color:last').css('backgroundColor', "rgb(" + colors[i][0] + ", " + colors[i][1] + ", " + 
        colors[i][2] + ")");
  }

  $('#palette div.color').live('click', function(event) {
    $('#palette div.color').css("borderWidth", "1px");
    $(event.target).css("borderWidth", "2px");
    app.brickifier.penColor = $(event.target).attr('data-color');
  });
	
	app.run("#/");

  

  $('#iso_viewer').dragscrollable();
	
	window.app = app;
});


$(function(){
  var full = $('#full'), fit = $('#fit'), viewer = $('#iso_viewer');
  
  full.click(function(e){
    viewer.addClass('full').removeClass('fit')
    full.addClass('active');
    fit.removeClass('active');
    e.preventDefault();
  })
  
  fit.click(function(e){
    viewer.addClass('fit').removeClass('full')
    fit.addClass('active');
    full.removeClass('active');
    e.preventDefault();
  })
})




/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
 //http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}





