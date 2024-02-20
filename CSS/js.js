$('#m3').click(m2);

function xav(){$('.xaver').hide();}

function m2()
{
	
	z=$(this).attr('rel');
	if(z==1)
	{
		$(this).attr('rel','2');
		$('#m2').show();
	}
	if(z==2)
	{
		$(this).attr('rel','1');
		$('#m2').hide();
	}
}

$('.subas').click(subas);

function subas()
{
	
	$('.subse').css('display','block');
}

$('.a_menu').click(a_menu);

function a_menu()
{
	x=$(this).attr('rel');
	$('#ujas').load('../menu/cmenu.php?id='+x);
}


$('.xaver').click(xaver);
function xaver()
{
	
	$(this).before('<div class="subcategory_page_product_boxes_container"></div>');
	$(this).prev().load('/tovar.php');
}
$('.aylar').click(aylar);
$('.bag').click(bag);
function aylar()
{
	rel=$(this).attr('rel');
	if(rel==1){
		rr=$(this).attr('data');
		$('.ayliq').hide();
		$('.ayliq[data="'+rr+'"]').show();
		$('.aylar').html(title);
	}
	
}

function bag()
{
$('.ayliq').hide();
}





$('.bas').click(basket);

function basket()
{
	bas=$(this).attr('rel');
	$('.adding_to_cart_window').show();
	$('#baskec').load('/slay/basket.php?bar='+bas);
	setTimeout(basget, 3000);
}


$('#basget').click(basget);

function basget()
{

	$('.adding_to_cart_window').hide();
}

$('.bas_2').click(basket_2);

function basket_2()
{
	bas=$(this).attr('rel');
	$('.adding_to_cart_window').show();
	$('#baskec').load('/slay/basket_2.php?bar='+bas);
	setTimeout(basget, 3000);
}