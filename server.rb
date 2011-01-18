require 'rubygems'
require 'sinatra'
require 'pony'


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
