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
  #begin
    headers 'Cache-Control' => 'public, max-age 43200'
    content_type 'text/css'
    sass :"sass/#{name}"
  #rescue
    #halt 404
  #end
end

get '/proxy' do
  uri = URI.parse(params[:url])
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true if uri.scheme == "https"
  image_response = nil
  http.start {
    image_response = http.request_get(uri.path)
  }
  
  content_type = image_response.response['Content-Type']
  if ["image/png", "image/jpeg", "image/jpg", "image/gif"].include?(content_type) && image_response.body.length < 1000000
    headers 'Cache-Control' => 'public, max-age 43200'
    response.headers['Content-Type'] = content_type  
    image_response.body
  end
end