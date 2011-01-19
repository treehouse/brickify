require 'rubygems'
require 'sinatra'
require 'net/http'
require 'net/https'

get '/' do
  haml :app
end

get '/demo' do
  haml :demo
end


get '/css/:name.css' do |name|
  begin
    headers 'Cache-Control' => 'public, max-age 43200'
    content_type 'text/css'
    sass :"sass/#{name}"
  rescue
    halt 404
  end
end

get '/proxy' do
  image_response = Net::HTTP.get_response(URI.parse(params[:url]))
  
  content_type = image_response.response['Content-Type']
  if ["image/png", "image/jpeg", "image/jpg", "image/gif"].include?(content_type) && image_response.body.length < 1000000
    response.headers['Content-Type'] = content_type  
    image_response.body
  end
end