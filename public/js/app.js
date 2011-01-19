(function(){
  // Units in mm
  
  BRICK_WIDTH = 8; //mm
  BRICK_HEIGHT = 9.6; //mm
  
  colors = [
    [255, 255 ,255], //white
    [188,6,2], // red
    [36,98,175], //blue
    [243,194,3], //yellow
    [50,50,50], //dark gray
    [45,160,85], //green
    [176,160,109], //brown
    [213,127,40], //copper
    [116,149,200], //light blue
    [101,101,101], //gray
    [84,42,20], //brown
    [146,146,146], // light gray
    [154,186,61], // lime
    [37,62,102], //navy
    [215,53,156] //fuschia
  ]
  
  window.Brickifier = function(canvas){
    this.$canvas = $(canvas);
    this.canvas  = this.$canvas[0]
    this.ctx     = this.canvas.getContext('2d');
    
    this.final_width = 1000; //mm
  
    this.getBrickColor = this.getBrickColorAverage;  
    this.getBrickColor = this.getBrickColorNearestNeighbor;
    
    this.colorDistance = this.colorDistanceComplex;
    //this.colorDistance = this.colorDistanceBasic;
  }

  _.extend(Brickifier.prototype, {
    
    /* Load img src, and async trigger this.process() */
    initialize: function(img){
      var self = this;
      this.img = $('<img>').load(function(){
        self.img_width = self.img.height;
        self.img_height = self.img.width;
        
        self.process();
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
      var prop = this.img_width / this.img_height;
      
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
      
      if(data.data[offset + 4] < 1){
        color = [255, 255, 255];
      }
    
      return color;
    },
    
    generateColorGrid: function(){
      this.colorGrid = []
      
      for(var x=0; x < this.bricks_x; x++ ){
        this.colorGrid[x] = [];
        
        for(var y=0; y < this.bricks_y; y++){
          this.colorGrid[x][y] = this.nearestColor(this.getBrickColor(x, y));
        }
      }
    },
    
    drawBlocks: function(){
      var c, style;
      for(var x=0; x < this.bricks_x; x++){
        for(var y=0; y < this.bricks_y; y++){
          c = this.colorGrid[x][y];
          style = "rgb("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+")";


          this.ctx.fillStyle = style;

          this.ctx.fillRect(x*this.brick_width, y*this.brick_height, this.brick_width, this.brick_height);
        }
      }
    },
    
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
    
    colorDistanceBasic: function(color, base){
      var d = Math.abs(color[0] - base[0])
      d += Math.abs(color[1] - base[1])
      d += Math.abs(color[2] - base[2]) 
      return d
    },
    
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
    
    colorDistanceHSL: function(color, base){
      color = rgbToHsl.apply(null, color),
      base = rgbToHsl.apply(null, base);

      
      
    }
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
  
})() ;


$(function(){
	for(var i = 0,j = colors.length; i < j; i++) {
		$('#palette').append("<div class=\"color\"></div>");
		$('#palette div.color:last').css('backgroundColor', "rgb(" + colors[i][0] + ", " + colors[i][1] + ", " + colors[i][2] + ")");
	}
	
	$('#palette div.color').live('click', function(event) {
		alert($(event.target).css('backgroundColor'));
	});
	
  b = new Brickifier('#canvas1');
  b.initialize('/images/carsonified.png');
  
  b1 = new Brickifier('#canvas2');
  b1.initialize('/images/dropbox.png');
  
  b2 = new Brickifier('#canvas3');
  b2.initialize('/images/html5.png');
  
  b3 = new Brickifier('#canvas4');
  b3.initialize('/images/ryancarson.jpg');
  
  b4 = new Brickifier('#canvas5');
  b4.initialize('/images/ferrari.jpg');
  
})