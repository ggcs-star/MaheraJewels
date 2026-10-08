<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover">
    <title>My Profile | MAHERA JEWEL</title>
    <link rel="icon" type="image/jpeg" href="{{ asset('images/mjlogo.jpeg') }}">
    <link rel="stylesheet" href="{{ asset('mobile/style.css') }}">
    <link rel="stylesheet" href="{{ asset('mobile/profile.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="profile-page">
    <header class="site-header" id="site-header"></header>
    
    <main class="profile-content">
        <div class="profile-container" id="profile-container">
            
        </div>
    </main>
    
    <input type="file" id="avatarUpload" accept="image/jpeg,image/jpg,image/png,image/webp" style="opacity: 0; position: absolute; z-index: -1; width: 0.1px; height: 0.1px;">
    <footer class="site-footer" id="site-footer"></footer>
    <nav class="mobile-bottom-nav" id="mobile-bottom-nav"></nav>
    
    <script>
        window.API_BASE_URL = "{{ env('API_BASE_URL') }}";
    </script>
    <script src="{{ asset('mobile/script.js') }}"></script>
    <script src="{{ asset('mobile/profile.js') }}"></script>
    @include('mobile.auth.auth')

    @include('components.footer')
</body>
</html>