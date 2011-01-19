require 'rubygems'
require 'sinatra'
require 'net/http'
require 'net/https'

get '/' do
  haml :app
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
  
  response.headers['Content-Type'] = image_response.response['Content-Type']
  image_response.body
end