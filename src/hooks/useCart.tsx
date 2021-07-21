import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { ProductList } from '../pages/Home/styles';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
  
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
       return [];
        
  });

  const addProduct = async (productId: number) => {
    try {
      
      //updatecarted recebe um novo array de cart (imutabilidade), toda alteração em updatedcart nao muda o cart.
      const updatedCart = [...cart];

      //Verifica se o id do produto que ta no updated cart e igual o id selecionado
      const productExists = updatedCart.find(product => product.id === productId)

      //chama rota do stock retorna o ID e o Amount.
      const stock = await api.get(`/stock/${productId}`);

      //total de Estock do produto setado
      const stockAmount = stock.data.amount;

      //estoque atual do carrinho (se existe traz o amount se nao existe e zero)
      const currentAmount = productExists ? productExists.amount : 0;

      const amount = currentAmount + 1;

      // Verifica se a quantidade deseja e maior do que o estoque se sim falha com return
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;  
      }

      //verifica se o produto existe no carrinho se tiver atualiza o amount apenas
      if(productExists){
        productExists.amount = amount;
      }else{
        // produto novo
        const product = await api.get(`/products/${productId}`);

        //inclui um novo campo no product (amount) e passa o valor 1
        const newProduct = {...product.data, amount: 1}; 
        
        //Adiciona o novo produto no UpdatedCart (Nao quebra a imutabilidade porque nao aponta para cart.)
        updatedCart.push(newProduct)
      }   


      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
      else{
        //Força o Erro para cair no Catch
        throw Error();
      }
      

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
           
      //Se Quantidade for menor ou igual zero, sair da função.
      if (amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`); 
      const stockAmount = stock.data.amount;

      //Se quantiade solicitada for maior do que estoque, alertar e sair da função
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //Atualizar Produto
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);
      
      if (productExists){
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      }
      else{
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
