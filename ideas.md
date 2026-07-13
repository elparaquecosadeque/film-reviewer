# Ideas to implement later

1. create a folder to input the reviews in audio format that then when running the "deno task review" the program can have a parameter to point to the file or else by default get the audios from that folder and process as regular

2. esta app se convierte en una web o tiene una parte web tambien, aquí las reglas:
- en formato de cards, se muestra el título, el link de la pelicula en letterbox, el poster de la pelicula, la review resumida y de manera colapsada el raw review.
- el formato json de los reviews tendrá un bool llamado "published" este determinará si una review ha sido publicada o no por el usuario
- el link del titulo de la pelicula se obtendrá a través de un headless browser scraping a letterbox buscando la pelicula y obteniendo el primer match del buscador de Letterbox (esta puede ser faulty por eso la razón de hacerlo editable en el card)
- el usuario podrá enmendar el link del titulo en caso lo vea necesario y será el link del perfil de la pelicula hacia donde letterbox introducirá por navegador
- los cards se presentarán al usuario cuando navegue a la página Processed Reviews en forma de stack de cards haciendo foco en primer plano de cada card cuando el usuario le dé a siguiente

### tech specs:
esto tal vez pueda hacerse en angular latest stable

### routes:
para separar las páginas: crear una interfaz de usuario donde pueda cargar los audios, el cual podrá hacer un boton de search files o de drag and drop, esta página se puede llamar "Unprocessed Reviews". La página donde aparezcan los cards con las películas procesadas se puede llamar "Processed Reviews". La página se llamará Film Reviewer