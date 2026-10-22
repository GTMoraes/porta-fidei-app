import { Platform } from 'react-native';

/** Como chamar o aparelho nos textos do app */
export const APARELHO = Platform.OS === 'ios' ? 'iPhone' : 'celular';
/** Onde ficam as permissões do app no aparelho */
export const AJUSTES_DO_APARELHO = Platform.OS === 'ios' ? 'nos Ajustes do iPhone' : 'nas Configurações do celular';
